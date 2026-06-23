/**
 * AI 对话工具 — DeepSeek API
 *
 * 使用方式:
 *   const ai = require('../../utils/ai');
 *   ai.chat(messages).then(reply => { ... });
 */

var API_URL = 'https://api.deepseek.com/v1/chat/completions';
var MODEL = 'deepseek-chat';
var DEFAULT_KEY = 'sk-ac34ca6ee57c4ebdb4e0b8b2ae7eb01e';
var _apiKey = DEFAULT_KEY;

/**
 * 更换 API Key（可选，默认已内置）
 */
function setApiKey(key) {
  _apiKey = key || DEFAULT_KEY;
  wx.setStorageSync('ai_api_key', _apiKey);
}

/**
 * 获取当前 Key
 */
function getApiKey() {
  return _apiKey;
}

/**
 * 发送对话请求
 * @param {Array}  messages  消息列表 [{role:'user'|'assistant'|'system', content:'...'}]
 * @returns {Promise<string>} AI 回复文本
 */
function chat(messages) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + _apiKey
      },
      data: {
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      success: function (res) {
        if (res.statusCode === 200 && res.data && res.data.choices) {
          resolve(res.data.choices[0].message.content);
        } else {
          var errMsg = (res.data && res.data.error && res.data.error.message)
            || ('HTTP ' + res.statusCode);
          reject(new Error(errMsg));
        }
      },
      fail: function (err) {
        reject(new Error(err.errMsg || '网络请求失败'));
      }
    });
  });
}

/**
 * 快速单轮问答
 */
function ask(question) {
  return chat([{ role: 'user', content: question }]);
}

module.exports = {
  setApiKey: setApiKey,
  getApiKey: getApiKey,
  chat: chat,
  ask: ask
};
