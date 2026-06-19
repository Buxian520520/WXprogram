/**
 * 学生表单页逻辑
 * 支持三种模式: add (添加), edit (编辑), view (查看)
 */

const api = require('../../utils/api');
const validator = require('../../utils/validator');
const app = getApp();

Page({
  data: {
    // 模式
    mode: 'add',          // 'add' | 'edit' | 'view'
    isView: false,
    isEdit: false,

    // 表单数据
    form: {
      sno: '',
      name: '',
      gender: '',
      birthday: '',
      mobile: '',
      email: '',
      address: '',
      image: '',
      imageUrl: ''
    },

    // 错误信息
    errors: {},

    // 选项
    genderOptions: ['男', '女'],
    genderIndex: -1,
    today: '',

    // 状态
    submitting: false,
    baseURL: api.BASE_URL
  },

  onLoad(options) {
    const mode = options.mode || 'add';
    const sno = options.sno ? parseInt(options.sno) : null;

    this.setData({
      mode: mode,
      isView: mode === 'view',
      isEdit: mode === 'edit',
      today: this.getTodayStr()
    });

    if (mode === 'edit' || mode === 'view') {
      if (sno) {
        this.loadStudentData(sno);
      }
      this.setNavigationTitle(mode === 'edit' ? '编辑学生' : '查看学生');
    } else {
      this.setNavigationTitle('添加学生');
    }
  },

  // ==================== 导航 ====================

  setNavigationTitle(title) {
    wx.setNavigationBarTitle({ title: title });
  },

  // ==================== 加载现有数据 ====================

  loadStudentData(sno) {
    // 从全局学生列表或通过 API 获取
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage && prevPage.data && prevPage.data.students) {
      const student = prevPage.data.students.find(s => s.sno === sno);
      if (student) {
        this.fillForm(student);
        return;
      }
    }

    // 兜底：通过 API 获取
    api.get('students/').then(res => {
      if (res.code === 1) {
        const student = (res.data || []).find(s => s.sno === sno);
        if (student) {
          this.fillForm(student);
        }
      }
    });
  },

  fillForm(student) {
    const genderIdx = student.gender === '女' ? 1 : 0;
    const form = {
      sno: String(student.sno),
      name: student.name || '',
      gender: student.gender || '',
      birthday: student.birthday || '',
      mobile: student.mobile || '',
      email: student.email || '',
      address: student.address || '',
      image: student.image || '',
      imageUrl: student.image ? (api.BASE_URL + 'media/' + student.image) : ''
    };

    this.setData({
      form: form,
      genderIndex: genderIdx
    });
  },

  // ==================== 表单字段变更 ====================

  onFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`form.${field}`]: value
    });
    // 清除对应错误
    if (this.data.errors[field]) {
      this.setData({ [`errors.${field}`]: '' });
    }
  },

  onGenderChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      genderIndex: idx,
      'form.gender': this.data.genderOptions[idx],
      'errors.gender': ''
    });
  },

  onBirthdayChange(e) {
    this.setData({
      'form.birthday': e.detail.value,
      'errors.birthday': ''
    });
  },

  // ==================== 学号异步校验 ====================

  checkSnoExists() {
    if (this.data.isEdit) return; // 编辑模式跳过

    const sno = this.data.form.sno;
    if (!sno || !validator.isValidSno(sno)) return;

    api.post('sno/check/', { sno: parseInt(sno) })
      .then(res => {
        if (res.code === 1 && res.exists) {
          this.setData({ 'errors.sno': '学号已存在！' });
        }
      })
      .catch(() => { /* 忽略校验错误 */ });
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
        // 先本地预览
        that.setData({ 'form.imageUrl': filePath });

        wx.showLoading({ title: '上传中...' });
        api.uploadFile(filePath, 'avatar')
          .then(data => {
            wx.hideLoading();
            if (data.code === 1) {
              that.setData({
                'form.image': data.name,
                'form.imageUrl': api.BASE_URL + 'media/' + data.name
              });
              wx.showToast({ title: '头像上传成功', icon: 'success' });
            } else {
              wx.showToast({ title: '上传失败', icon: 'none' });
            }
          })
          .catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          });
      }
    });
  },

  // ==================== 提交表单 ====================

  submitForm() {
    const { form, isEdit } = this.data;

    // 验证
    const result = validator.validateStudentForm({
      sno: form.sno ? parseInt(form.sno) : '',
      name: form.name,
      gender: form.gender,
      birthday: form.birthday,
      mobile: form.mobile,
      email: form.email,
      address: form.address
    }, isEdit);

    if (!result.valid) {
      this.setData({ errors: result.errors });
      wx.showToast({ title: '请检查表单信息', icon: 'none' });
      return;
    }

    this.setData({ submitting: true, errors: {} });

    const submitData = {
      sno: parseInt(form.sno),
      name: form.name,
      gender: form.gender,
      birthday: form.birthday,
      mobile: form.mobile || '',
      email: form.email || '',
      address: form.address || '',
      image: form.image || ''
    };

    const url = isEdit ? 'student/update/' : 'student/add/';
    const that = this;

    api.post(url, submitData)
      .then(res => {
        that.setData({ submitting: false });
        if (res.code === 1) {
          wx.showToast({
            title: isEdit ? '修改成功' : '添加成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 800);
        } else {
          wx.showToast({ title: res.msg || '操作失败', icon: 'none' });
        }
      })
      .catch(() => {
        that.setData({ submitting: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
  },

  // ==================== 取消 ====================

  cancelForm() {
    wx.navigateBack();
  },

  // ==================== 工具方法 ====================

  getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
});
