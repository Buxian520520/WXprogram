/**
 * 讲师信息页逻辑
 * 查看和编辑当前教师的个人信息
 */

const api = require('../../utils/api');
const validator = require('../../utils/validator');

Page({
  data: {
    isEdit: false,

    form: {
      teacherNo: '',
      name: '',
      age: '',
      gender: '',
      mobile: '',
      email: '',
      department: '',
      title: '',
      hireDate: '',
      description: '',
      avatar: '',
      avatarUrl: ''
    },

    genderOptions: ['男', '女'],
    genderIndex: -1,
    titleOptions: ['助教', '讲师', '副教授', '教授'],
    titleIndex: -1,
    today: '',

    errors: {},
    loading: false
  },

  onLoad() {
    const now = new Date();
    this.setData({
      today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onShow() {
    this.loadTeacherInfo();
  },

  // ==================== 数据加载 ====================

  loadTeacherInfo() {
    wx.showLoading({ title: '加载中...' });
    const that = this;

    api.get('teacher/info/')
      .then(res => {
        wx.hideLoading();
        if (res.code === 1 && res.data) {
          const d = res.data;
          that.setData({
            form: {
              teacherNo: d.teacherNo || '',
              name: d.name || '',
              age: d.age ? String(d.age) : '',
              gender: d.gender || '',
              mobile: d.mobile || '',
              email: d.email || '',
              department: d.department || '',
              title: d.title || '',
              hireDate: d.hireDate || '',
              description: d.description || '',
              avatar: d.avatar || '',
              avatarUrl: d.avatarUrl || ''
            },
            genderIndex: d.gender === '女' ? 1 : d.gender === '男' ? 0 : -1,
            titleIndex: that.data.titleOptions.indexOf(d.title)
          });
        } else {
          wx.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  // ==================== 编辑模式 ====================

  toggleEdit() {
    if (this.data.isEdit) {
      // 取消编辑，重新加载
      this.setData({ isEdit: false, errors: {} });
      this.loadTeacherInfo();
    } else {
      this.setData({ isEdit: true });
    }
  },

  // ==================== 字段变更 ====================

  onFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
    if (this.data.errors[field]) {
      this.setData({ [`errors.${field}`]: '' });
    }
  },

  onGenderChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      genderIndex: idx,
      'form.gender': this.data.genderOptions[idx]
    });
  },

  onTitleChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      titleIndex: idx,
      'form.title': this.data.titleOptions[idx]
    });
  },

  onHireDateChange(e) {
    this.setData({ 'form.hireDate': e.detail.value });
  },

  // ==================== 头像上传 ====================

  chooseAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const filePath = res.tempFilePaths[0];
        that.setData({ 'form.avatarUrl': filePath });
        wx.showLoading({ title: '上传中...' });
        api.uploadFile(filePath, 'avatar')
          .then(data => {
            wx.hideLoading();
            if (data.code === 1) {
              that.setData({
                'form.avatar': data.name,
                'form.avatarUrl': api.BASE_URL + 'media/' + data.name
              });
            }
          })
          .catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          });
      }
    });
  },

  // ==================== 保存 ====================

  saveInfo() {
    const { form } = this.data;

    // 简单验证
    const result = validator.validateTeacherForm(form);
    if (!result.valid) {
      this.setData({ errors: result.errors });
      wx.showToast({ title: '请检查信息', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    const that = this;

    const updateData = {
      name: form.name,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      mobile: form.mobile,
      email: form.email,
      department: form.department,
      title: form.title,
      hireDate: form.hireDate,
      description: form.description,
      avatar: form.avatar
    };

    api.post('teacher/update/', updateData)
      .then(res => {
        that.setData({ loading: false });
        if (res.code === 1) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          that.setData({ isEdit: false });
          that.loadTeacherInfo();
        } else {
          wx.showToast({ title: res.msg || '保存失败', icon: 'none' });
        }
      })
      .catch(() => {
        that.setData({ loading: false });
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
  }
});
