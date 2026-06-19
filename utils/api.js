/**
 * API 请求封装模块
 * 封装 wx.request，提供 Token 管理、自动刷新、请求拦截功能
 * 完全兼容现有的 Django 后端 API
 */

const BASE_URL = 'http://127.0.0.1:8000/';

// ==================== Token 管理 ====================

function getAccessToken() {
  try {
    const tokenData = wx.getStorageSync('token_data');
    if (!tokenData) return null;
    const { accessToken, expireTime } = tokenData;
    if (accessToken && expireTime > Date.now()) {
      return accessToken;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getRefreshToken() {
  try {
    const tokenData = wx.getStorageSync('token_data');
    return tokenData ? tokenData.refreshToken : null;
  } catch (e) {
    return null;
  }
}

function saveTokens(access_token, refresh_token) {
  wx.setStorageSync('token_data', {
    accessToken: access_token,
    refreshToken: refresh_token,
    expireTime: Date.now() + 29 * 60 * 1000 // 29分钟安全边界
  });
}

function clearTokens() {
  try {
    wx.removeStorageSync('token_data');
    wx.removeStorageSync('user_info');
  } catch (e) {
    // 静默处理
  }
}

// ==================== Token 刷新 ====================

let isRefreshing = false;
let refreshQueue = [];

function doRefreshToken() {
  return new Promise((resolve, reject) => {
    const rt = getRefreshToken();
    if (!rt) {
      return reject(new Error('无刷新 Token'));
    }
    wx.request({
      url: BASE_URL + 'refresh/',
      method: 'POST',
      data: { refresh_token: rt },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          saveTokens(res.data.access_token, rt);
          resolve(res.data.access_token);
        } else {
          reject(new Error(res.data.msg || '刷新 Token 失败'));
        }
      },
      fail: (err) => reject(err)
    });
  });
}

// ==================== 核心请求方法 ====================

/**
 * 发起网络请求
 * @param {Object} options
 * @param {string} options.url - 请求路径（相对于 BASE_URL）
 * @param {string} options.method - 请求方法 GET/POST
 * @param {Object} options.data - 请求数据
 * @param {Object} options.header - 额外请求头
 * @param {boolean} options.skipAuth - 跳过 Token 认证
 * @param {boolean} options._retry - 内部标记，防止无限重试
 */
function request(options) {
  const { url, method = 'GET', data = {}, header = {}, skipAuth = false } = options;

  const headers = { ...header };
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
  }
  // 仅在未显式设置 Content-Type 时默认 JSON
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    function doRequest() {
      wx.request({
        url: BASE_URL + url.replace(/^\//, ''),
        method: method,
        data: data,
        header: headers,
        success: (res) => {
          // 处理 401 — Token 过期，尝试刷新
          if (res.statusCode === 401 && !options._retry) {
            if (isRefreshing) {
              // 加入队列等待刷新完成
              refreshQueue.push(() => {
                const newOpts = { ...options, _retry: true };
                request(newOpts).then(resolve).catch(reject);
              });
              return;
            }

            isRefreshing = true;
            options._retry = true;

            doRefreshToken()
              .then(() => {
                // 更新请求头
                headers['Authorization'] = 'Bearer ' + getAccessToken();
                // 清空等待队列
                refreshQueue.forEach(cb => cb());
                refreshQueue = [];
                // 重试原请求
                doRequest();
              })
              .catch(() => {
                refreshQueue = [];
                clearTokens();
                wx.reLaunch({ url: '/pages/login/login' });
                reject(new Error('登录已过期，请重新登录'));
              })
              .finally(() => {
                isRefreshing = false;
              });
            return;
          }
          resolve(res.data);
        },
        fail: (err) => {
          reject(err);
        }
      });
    }
    doRequest();
  });
}

// ==================== 便捷方法 ====================

function get(url, params = {}, skipAuth = false) {
  const qs = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== null && params[k] !== undefined)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request({
    url: qs ? url + (url.includes('?') ? '&' : '?') + qs : url,
    method: 'GET',
    skipAuth
  });
}

function post(url, data = {}, skipAuth = false) {
  return request({ url, method: 'POST', data, skipAuth });
}

// ==================== 文件上传 ====================

function uploadFile(filePath, name) {
  name = name || 'avatar';
  return _upload(BASE_URL + 'upload/', filePath, name);
}

function uploadExcel(filePath) {
  return _upload(BASE_URL + 'excel/import/', filePath, 'excel');
}

/**
 * 统一上传方法（含 401 Token 自动刷新重试）
 */
function _upload(url, filePath, name, _retry) {
  _retry = _retry || false;
  return new Promise((resolve, reject) => {
    const token = getAccessToken();
    const header = {};
    if (token) {
      header['Authorization'] = 'Bearer ' + token;
    }
    wx.uploadFile({
      url: url,
      filePath: filePath,
      name: name,
      header: header,
      success: (res) => {
        // 401 → 刷新 Token 并重试一次
        if (res.statusCode === 401 && !_retry) {
          const rt = getRefreshToken();
          if (!rt) {
            reject({ code: 401, msg: '登录已过期，请重新登录' });
            return;
          }
          wx.request({
            url: BASE_URL + 'refresh/',
            method: 'POST',
            data: { refresh_token: rt },
            header: { 'Content-Type': 'application/json' },
            success: (refreshRes) => {
              if (refreshRes.statusCode === 200 && refreshRes.data.code === 200) {
                saveTokens(refreshRes.data.access_token, rt);
                // 用新 Token 重试上传
                _upload(url, filePath, name, true).then(resolve).catch(reject);
              } else {
                clearTokens();
                wx.reLaunch({ url: '/pages/login/login' });
                reject({ code: 401, msg: '登录已过期，请重新登录' });
              }
            },
            fail: () => {
              reject({ code: 401, msg: '网络错误，无法刷新登录状态' });
            }
          });
          return;
        }

        // 正常响应
        try {
          const data = JSON.parse(res.data);
          if (data.code === 1 || data.code === 200) {
            resolve(data);
          } else {
            reject(data);
          }
        } catch (e) {
          reject({ code: 0, msg: '解析响应失败' });
        }
      },
      fail: (err) => reject(err)
    });
  });
}

// ==================== JWT 解码 ====================

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    // 补齐 Base64 URL 编码
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    // 使用微信小程序的 base64 解码
    const charArr = wx.base64ToArrayBuffer(base64);
    const uint8Arr = new Uint8Array(charArr);
    let str = '';
    for (let i = 0; i < uint8Arr.length; i++) {
      str += String.fromCharCode(uint8Arr[i]);
    }
    return JSON.parse(decodeURIComponent(escape(str)));
  } catch (e) {
    console.error('JWT 解码失败:', e);
    return null;
  }
}

// ==================== 登录/注册快捷方法 ====================

function login(username, password, role) {
  return post('login/', { username, password, role }, true);
}

function register(regData) {
  return post('register/', regData, true);
}

// ==================== 导出 ====================

module.exports = {
  BASE_URL,
  request,
  get,
  post,
  uploadFile,
  uploadExcel,
  login,
  register,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  decodeJWT
};
