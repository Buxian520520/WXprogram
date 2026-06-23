/**
 * 登录页逻辑
 * 支持登录/注册切换、学生/教师角色切换
 */

const api = require('../../utils/api');
const validator = require('../../utils/validator');
const app = getApp();

Page({
  data: {
    // 模式：login | register
    mode: 'login',

    // 登录相关
    loginRole: '',          // 'student' | 'teacher'
    loginForm: {
      username: '',
      password: ''
    },

    // 注册相关
    registerRole: 'student',
    registerForm: {
      username: '',
      password: '',
      // 学生字段
      student_name: '',
      gender: '',
      birthday: '',
      mobile: '',
      email: '',
      address: '',
      // 教师字段
      teacher_name: ''
    },
    regErrors: {},
    genderOptions: ['男', '女'],
    genderIndex: -1,
    today: '',

    // 通用
    loading: false,
    message: '',
    messageType: 'error',

    // 密码显示控制
    loginShowPassword: false,
    regShowPassword: false
  },

  onLoad() {
    // 设置今天日期，用于生日picker的end属性
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this.setData({ today: `${y}-${m}-${d}` });

    // 检查是否已登录
    const token = api.getAccessToken();
    if (token) {
      const decoded = api.decodeJWT(token);
      if (decoded) {
        const url = decoded.role === 'teacher'
          ? '/pages/student-list/student-list'
          : '/pages/checkin/checkin';
        wx.switchTab({ url });
      }
    }
  },

  // ==================== 模式切换 ====================

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode, message: '', regErrors: {} });
  },

  // ==================== 密码显示切换 ====================

  toggleLoginPassword() {
    this.setData({ loginShowPassword: !this.data.loginShowPassword });
  },

  toggleRegPassword() {
    this.setData({ regShowPassword: !this.data.regShowPassword });
  },

  // ==================== 登录角色选择 ====================

  selectLoginRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({ loginRole: role });
  },

  // ==================== 登录表单 ====================

  onLoginFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`loginForm.${field}`]: value
    });
  },

  handleLogin() {
    const { loginForm, loginRole } = this.data;

    // 简单校验
    if (!loginForm.username.trim()) {
      this.showMessage('请输入账号', 'error');
      return;
    }
    if (!loginForm.password) {
      this.showMessage('请输入密码', 'error');
      return;
    }

    const loadStart = Date.now();
    this.setData({ loading: true, message: '' });

    api.login(loginForm.username.trim(), loginForm.password, loginRole || undefined)
      .then(res => {
        // loading 至少展示 300ms，避免按钮快速切换导致闪烁
        const delay = Math.max(0, 300 - (Date.now() - loadStart));
        setTimeout(() => {
          if (res.code === 200) {
            // 保存 Token
            api.saveTokens(res.access_token, res.refresh_token);

            // 从 JWT 解析用户信息
            const decoded = api.decodeJWT(res.access_token);
            if (decoded) {
              wx.setStorageSync('user_info', {
                role: decoded.role || '',
                displayName: decoded.display_name || loginForm.username,
                username: decoded.username || loginForm.username
              });

              // 更新全局数据
              app.globalData.userRole = decoded.role || '';
              app.globalData.displayName = decoded.display_name || loginForm.username;
              app.globalData.username = decoded.username || loginForm.username;

              this.showMessage('登录成功！', 'success', { loading: false });
              setTimeout(() => {
                const url = decoded.role === 'teacher'
                  ? '/pages/student-list/student-list'
                  : '/pages/checkin/checkin';
                wx.switchTab({ url });
              }, 600);
            }
          } else {
            this.showMessage(res.msg || '登录失败', 'error', { loading: false });
          }
        }, delay);
      })
      .catch(err => {
        const msg = (err && err.msg) ? err.msg : '网络错误，请重试';
        const delay = Math.max(0, 300 - (Date.now() - loadStart));
        setTimeout(() => {
          this.showMessage(msg, 'error', { loading: false });
        }, delay);
      });
  },

  // ==================== 注册角色选择 ====================

  selectRegisterRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({
      registerRole: role,
      regErrors: {}
    });
  },

  // ==================== 注册表单 ====================

  onRegFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`registerForm.${field}`]: value
    });
    // 清除对应字段的错误
    if (this.data.regErrors[field]) {
      this.setData({
        [`regErrors.${field}`]: ''
      });
    }
  },

  onGenderChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      genderIndex: idx,
      'registerForm.gender': this.data.genderOptions[idx],
      'regErrors.gender': ''
    });
  },

  onBirthdayChange(e) {
    this.setData({
      'registerForm.birthday': e.detail.value,
      'regErrors.birthday': ''
    });
  },

  handleRegister() {
    const { registerForm, registerRole } = this.data;
    const errors = {};
    const username = String(registerForm.username || '').trim();

    // 公共校验
    if (!username) {
      errors.username = registerRole === 'student' ? '学号不能为空' : '工号不能为空';
    }
    if (registerRole === 'student' && !validator.isValidSno(username)) {
      errors.username = '学号必须是95开头的五位数';
    }
    if (!registerForm.password) {
      errors.password = '密码不能为空';
    } else if (registerForm.password.length < 6) {
      errors.password = '密码至少6个字符';
    }

    // 学生注册额外校验
    if (registerRole === 'student') {
      if (!registerForm.student_name || !registerForm.student_name.trim()) {
        errors.student_name = '姓名不能为空';
      }
      if (!registerForm.gender) {
        errors.gender = '请选择性别';
      }
      if (!registerForm.birthday) {
        errors.birthday = '请选择生日';
      }
    }

    if (Object.keys(errors).length > 0) {
      this.setData({ regErrors: errors });
      return;
    }

    const loadStart = Date.now();
    this.setData({ loading: true, message: '', regErrors: {} });

    // 构建注册数据
    const regData = {
      username: username,
      password: registerForm.password,
      role: registerRole
    };

    if (registerRole === 'student') {
      regData.student_name = registerForm.student_name.trim();
      regData.gender = registerForm.gender;
      regData.birthday = registerForm.birthday;
      regData.mobile = registerForm.mobile.trim();
      regData.email = registerForm.email.trim();
      regData.address = registerForm.address.trim();
    } else {
      regData.teacher_name = (registerForm.teacher_name || username).trim();
      regData.teacher_no = username;
    }

    api.register(regData)
      .then(res => {
        // loading 至少展示 300ms，避免按钮快速切换导致闪烁
        const delay = Math.max(0, 300 - (Date.now() - loadStart));
        setTimeout(() => {
          if (res.code === 200) {
            // 注册成功，保存 Token 并登录
            if (res.access_token && res.refresh_token) {
              api.saveTokens(res.access_token, res.refresh_token);

              const decoded = api.decodeJWT(res.access_token);
              if (decoded) {
                wx.setStorageSync('user_info', {
                  role: decoded.role || registerRole,
                  displayName: decoded.display_name || username,
                  username: decoded.username || username
                });
                app.globalData.userRole = decoded.role || registerRole;
                app.globalData.displayName = decoded.display_name || username;
                app.globalData.username = decoded.username || username;
              }

              this.showMessage(res.msg || '注册成功！', 'success', { loading: false });
              setTimeout(() => {
                const role = decoded.role || registerRole;
                const url = role === 'teacher'
                  ? '/pages/student-list/student-list'
                  : '/pages/checkin/checkin';
                wx.switchTab({ url });
              }, 800);
            } else {
              // 注册成功但没返回Token → 预填登录表单并切换到登录模式
              this.showMessage(res.msg || '注册成功，请登录', 'success', {
                loading: false,
                loginForm: {
                  username: username,
                  password: registerForm.password
                }
              });
              setTimeout(() => {
                this.setData({ mode: 'login' });
              }, 1200);
            }
          } else {
            this.showMessage(res.msg || '注册失败', 'error', { loading: false });
          }
        }, delay);
      })
      .catch(err => {
        const msg = (err && err.msg) ? err.msg : '网络错误，请重试';
        const delay = Math.max(0, 300 - (Date.now() - loadStart));
        setTimeout(() => {
          this.showMessage(msg, 'error', { loading: false });
        }, delay);
      });
  },

  // ==================== 消息提示 ====================

  showMessage(msg, type, extraData = {}) {
    this.setData({ message: msg, messageType: type, ...extraData });
    if (type === 'success') {
      // 成功消息3秒后消失
      setTimeout(() => {
        this.setData({ message: '' });
      }, 3000);
    } else {
      // 错误消息5秒后消失
      setTimeout(() => {
        this.setData({ message: '' });
      }, 5000);
    }
  }
});
