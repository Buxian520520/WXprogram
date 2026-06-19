/**
 * 签到模块
 * 教师：发布签到任务（二维码/位置），查看签到记录和位置
 * 学生：签到、查看签到历史
 */
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    userRole: '',
    baseURL: api.BASE_URL,

    // ===== 教师：创建签到 =====
    checkinType: 'qrcode',        // 'qrcode' | 'location'
    checkinTypeIndex: 0,
    checkinTypes: ['二维码签到', '位置签到'],
    rangeValue: 100,              // 位置签到范围（米）
    taskTitle: '',

    // ===== 教师：任务列表 =====
    activeTasks: [],
    historyTasks: [],
    taskRecords: [],
    showRecordsFor: null,         // 当前查看记录的任务 ID
    showLocationsFor: null,       // 当前查看位置的任务 ID
    locationList: [],
    showAttendanceFor: null,      // 当前查看考勤的任务 ID
    attendanceData: null,         // { task, total, signedCount, unsignedCount, list }

    // ===== 学生：签到 =====
    studentTasks: [],
    myRecords: [],
    checkinCode: '',              // 二维码签到的码
    myLat: 0,
    myLng: 0,
    locating: false,

    // 通用
    loading: false,
    submitting: false
  },

  onLoad() {
    const role = app.globalData.userRole || 'student';
    this.setData({ userRole: role });
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.syncSelected();

    const role = app.globalData.userRole || 'student';
    this.setData({ userRole: role });
    if (role === 'teacher') {
      this.loadActiveTasks();
      this.loadHistory();
    } else {
      this.loadStudentTasks();
      this.loadMyRecords();
    }
  },

  // ==================== 教师：加载进行中的任务 ====================

  loadActiveTasks() {
    this.setData({ loading: true });
    api.get('checkin/tasks/').then(res => {
      this.setData({ loading: false });
      if (res.code === 1) {
        this.setData({ activeTasks: res.data || [] });
      }
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  // ==================== 教师：切换签到类型 ====================

  onTypeChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({
      checkinTypeIndex: idx,
      checkinType: idx === 0 ? 'qrcode' : 'location'
    });
  },

  onRangeChange(e) {
    this.setData({ rangeValue: parseInt(e.detail.value) || 100 });
  },

  onTitleInput(e) {
    this.setData({ taskTitle: e.detail.value });
  },

  // ==================== 教师：发布签到 ====================

  publishCheckin() {
    const { checkinType, rangeValue, taskTitle } = this.data;
    if (this.data.submitting) return;

    if (checkinType === 'location') {
      this._getLocation((lat, lng) => {
        this._doPublish(lat, lng);
      });
    } else {
      this._doPublish(0, 0);
    }
  },

  _doPublish(lat, lng) {
    const { checkinType, rangeValue, taskTitle } = this.data;
    this.setData({ submitting: true });

    const data = {
      type: checkinType,
      title: taskTitle.trim() || (checkinType === 'qrcode' ? '二维码签到' : '位置签到'),
      range: rangeValue,
      lat: lat,
      lng: lng
    };

    api.post('checkin/create/', data).then(res => {
      this.setData({ submitting: false });
      if (res.code === 1) {
        wx.showToast({ title: '签到已发布', icon: 'success' });
        this.setData({ taskTitle: '', rangeValue: 100 });
        this.loadActiveTasks();
      } else {
        wx.showToast({ title: res.msg || '发布失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ submitting: false });
      wx.showToast({ title: '发布失败', icon: 'none' });
    });
  },

  // ==================== 教师：结束签到 ====================

  endCheckin(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '结束签到',
      content: '确定要结束这个签到任务吗？',
      success: (res) => {
        if (res.confirm) {
          api.post('checkin/end/', { task_id: taskId }).then(res => {
            if (res.code === 1) {
              wx.showToast({ title: '已结束', icon: 'success' });
              this.loadActiveTasks();
            } else {
              wx.showToast({ title: res.msg || '操作失败', icon: 'none' });
            }
          }).catch(() => {
            wx.showToast({ title: '操作失败', icon: 'none' });
          });
        }
      }
    });
  },

  // ==================== 教师：查看签到记录 ====================

  viewRecords(e) {
    const taskId = e.currentTarget.dataset.id;
    this.setData({ showRecordsFor: taskId, showLocationsFor: null });
    api.get('checkin/records/', { task_id: taskId }).then(res => {
      if (res.code === 1) {
        this.setData({ taskRecords: res.data || [] });
      }
    }).catch(() => {});
  },

  closeRecords() {
    this.setData({ showRecordsFor: null, taskRecords: [] });
  },

  // ==================== 教师：查看学生位置 ====================

  viewLocations(e) {
    const taskId = e.currentTarget.dataset.id;
    this.setData({ showLocationsFor: taskId, showRecordsFor: null });
    api.get('checkin/locations/', { task_id: taskId }).then(res => {
      if (res.code === 1) {
        this.setData({ locationList: res.data || [] });
      }
    }).catch(() => {});
  },

  closeLocations() {
    this.setData({ showLocationsFor: null, locationList: [] });
  },

  // ==================== 学生：加载进行中的签到 ====================

  loadStudentTasks() {
    api.get('checkin/tasks/').then(res => {
      if (res.code === 1) {
        this.setData({ studentTasks: res.data || [] });
      }
    }).catch(() => {});
  },

  loadMyRecords() {
    api.get('checkin/myrecords/').then(res => {
      if (res.code === 1) {
        this.setData({ myRecords: res.data || [] });
      }
    }).catch(() => {});
  },

  // ==================== 学生：二维码签到 ====================

  onCodeInput(e) {
    this.setData({ checkinCode: e.detail.value });
  },

  submitCodeCheckin(e) {
    const taskId = e.currentTarget.dataset.id;
    const code = this.data.checkinCode.trim();
    if (!code) {
      wx.showToast({ title: '请输入签到码', icon: 'none' });
      return;
    }
    this._doStudentSign(taskId, 'qrcode', { code: code });
  },

  // ==================== 学生：扫描二维码签到 ====================

  scanQrCode(e) {
    const taskId = e.currentTarget.dataset.id;
    const that = this;
    wx.scanCode({
      onlyFromCamera: true,
      success(res) {
        that._doStudentSign(taskId, 'qrcode', { code: res.result });
      },
      fail() {
        wx.showToast({ title: '扫描取消', icon: 'none' });
      }
    });
  },

  // ==================== 学生：位置签到 ====================

  locationCheckin(e) {
    const taskId = e.currentTarget.dataset.id;
    const that = this;
    this.setData({ locating: true });

    this._getLocation((lat, lng) => {
      that.setData({ myLat: lat, myLng: lng, locating: false });
      that._doStudentSign(taskId, 'location', { lat: lat, lng: lng });
    }, () => {
      that.setData({ locating: false });
    });
  },

  _doStudentSign(taskId, type, extra) {
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    const data = { task_id: taskId, type: type, ...extra };

    api.post('checkin/sign/', data).then(res => {
      this.setData({ submitting: false });
      if (res.code === 1) {
        wx.showToast({ title: '签到成功！', icon: 'success' });
        this.setData({ checkinCode: '' });
        this.loadStudentTasks();
        this.loadMyRecords();
      } else {
        wx.showToast({ title: res.msg || '签到失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ submitting: false });
      wx.showToast({ title: '签到失败', icon: 'none' });
    });
  },

  // ==================== 阻止冒泡 ====================

  // ==================== 教师：历史签到 & 考勤管理 ====================

  loadHistory() {
    api.get('checkin/history/').then(res => {
      if (res.code === 1) {
        this.setData({ historyTasks: res.data || [] });
      }
    }).catch(() => {});
  },

  // 查看考勤详情（全员含未签到）
  viewAttendance(e) {
    const taskId = e.currentTarget.dataset.id;
    this.setData({ showAttendanceFor: taskId });
    api.get('checkin/attendance/', { task_id: taskId }).then(res => {
      if (res.code === 1) {
        this.setData({ attendanceData: res.data });
      }
    }).catch(() => {});
  },

  closeAttendance() {
    this.setData({ showAttendanceFor: null, attendanceData: null });
  },

  // 手动补签
  addRecord(e) {
    const sno = e.currentTarget.dataset.sno;
    const name = e.currentTarget.dataset.name;
    const taskId = this.data.showAttendanceFor;
    if (!taskId) return;

    const that = this;
    wx.showModal({
      title: '确认补签',
      content: `确定要为 ${name} (${sno}) 补签吗？`,
      success(res) {
        if (res.confirm) {
          api.post('checkin/record/add/', {
            task_id: taskId,
            sno: sno,
            name: name
          }).then(res => {
            if (res.code === 1) {
              wx.showToast({ title: '补签成功', icon: 'success' });
              that.viewAttendance({ currentTarget: { dataset: { id: taskId } } });
            } else {
              wx.showToast({ title: res.msg || '补签失败', icon: 'none' });
            }
          }).catch(() => {
            wx.showToast({ title: '补签失败', icon: 'none' });
          });
        }
      }
    });
  },

  // 删除签到记录
  removeRecord(e) {
    const sno = e.currentTarget.dataset.sno;
    const name = e.currentTarget.dataset.name;
    const taskId = this.data.showAttendanceFor;
    if (!taskId) return;

    const that = this;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${name} (${sno}) 的签到记录吗？`,
      confirmColor: '#F53F3F',
      success(res) {
        if (res.confirm) {
          api.post('checkin/record/remove/', {
            task_id: taskId,
            sno: sno
          }).then(res => {
            if (res.code === 1) {
              wx.showToast({ title: '已删除', icon: 'success' });
              that.viewAttendance({ currentTarget: { dataset: { id: taskId } } });
            } else {
              wx.showToast({ title: res.msg || '删除失败', icon: 'none' });
            }
          }).catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  // ==================== 定位授权（教师+学生通用） ====================

  _getLocation(successCb, failCb) {
    const that = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.userLocation'] === false) {
          // 之前拒绝过，引导去设置页开启
          wx.showModal({
            title: '需要定位权限',
            content: '位置签到需要获取您的位置信息，请在设置中开启定位权限。',
            confirmText: '去设置',
            success(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting({
                  success(settingRes) {
                    if (settingRes.authSetting['scope.userLocation']) {
                      that._doGetLocation(successCb, failCb);
                    } else {
                      wx.showToast({ title: '定位权限未开启', icon: 'none' });
                      if (failCb) failCb();
                    }
                  },
                  fail() {
                    wx.showToast({ title: '打开设置失败', icon: 'none' });
                    if (failCb) failCb();
                  }
                });
              } else {
                if (failCb) failCb();
              }
            }
          });
        } else if (res.authSetting['scope.userLocation'] === undefined) {
          // 首次请求，直接调用（微信会自动弹授权框）
          that._doGetLocation(successCb, failCb);
        } else {
          // 已授权
          that._doGetLocation(successCb, failCb);
        }
      },
      fail() {
        that._doGetLocation(successCb, failCb);
      }
    });
  },

  _doGetLocation(successCb, failCb) {
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        if (successCb) successCb(res.latitude, res.longitude);
      },
      fail() {
        wx.showToast({ title: '获取位置失败，请确保GPS已开启', icon: 'none' });
        if (failCb) failCb();
      }
    });
  },

  stopPropagation() {}
});
