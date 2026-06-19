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
    showLocationMap: false,      // 是否展示地图视图
    locationList: [],
    mapLat: 0,                   // 地图中心纬度
    mapLng: 0,                   // 地图中心经度
    mapMarkers: [],              // 地图标记点
    mapCircles: [],              // 签到范围圈
    currentTaskRange: 100,       // 当前查看任务的签到范围
    showAttendanceFor: null,      // 当前查看考勤的任务 ID
    attendanceData: null,         // { task, total, signedCount, unsignedCount, list }

    // ===== 学生：签到 =====
    studentTasks: [],
    myRecords: [],
    checkinCode: '',              // 二维码签到的码
    myLat: 0,
    myLng: 0,
    locating: false,

    // ===== 学生：位置签到地图 =====
    studentMapVisible: false,
    studentMapLat: 0,
    studentMapLng: 0,
    studentMapMarkers: [],
    studentMapCircles: [],
    studentSignTaskId: null,
    studentMapTeacherLat: 0,
    studentMapTeacherLng: 0,
    studentMapRange: 100,

    // 通用
    loading: false,
    submitting: false
  },

  onLoad() {
    const role = app.globalData.userRole || 'student';
    this.setData({ userRole: role });
  },

  onShow() {
    // 定位操作进行中（权限弹窗/设置页导致 onHide/onShow）→ 完全跳过避免闪烁
    if (this._locationBusy) return;

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
      this._locationBusy = true;
      this._getLocation((lat, lng) => {
        this._locationBusy = false;
        this._doPublish(lat, lng);
      }, () => {
        this._locationBusy = false;
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

    // 从 activeTasks 找到教师发布的位置和范围
    const task = (this.data.activeTasks || []).find(t => t.id == taskId);
    const teacherLat = task ? task.lat : 0;
    const teacherLng = task ? task.lng : 0;
    const range = task ? task.range : 100;

    // 隐藏底部 tab-bar，避免遮挡地图
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ tabBarHidden: true });

    this.setData({ showLocationsFor: taskId, showRecordsFor: null, showLocationMap: true, currentTaskRange: range });

    api.get('checkin/locations/', { task_id: taskId }).then(res => {
      if (res.code === 1) {
        const list = res.data || [];
        this.setData({ locationList: list });
        this._buildMap(teacherLat, teacherLng, range, list);
      }
    }).catch(() => {});
  },

  // 构建地图数据：优先以教师坐标为中心，否则使用地图内置定位
  _buildMap(teacherLat, teacherLng, range, locationList) {
    const markers = [];

    // 教师标记（参考原点）
    if (teacherLat && teacherLng) {
      markers.push({
        id: 0,
        latitude: teacherLat,
        longitude: teacherLng,
        width: 32,
        height: 32,
        callout: {
          content: '📍 教师位置',
          color: '#E74C3C',
          fontSize: 13,
          borderRadius: 8,
          padding: 6,
          display: 'ALWAYS'
        },
        label: {
          content: '教师',
          color: '#E74C3C',
          fontSize: 12,
          anchorX: 0,
          anchorY: -12
        }
      });
    }

    // 学生标记
    (locationList || []).forEach((item, idx) => {
      if (item.lat && item.lng) {
        markers.push({
          id: idx + 1,
          latitude: item.lat,
          longitude: item.lng,
          width: 24,
          height: 24,
          callout: {
            content: `${item.name}`,
            color: '#1677FF',
            fontSize: 12,
            borderRadius: 6,
            padding: 4,
            display: 'BYCLICK'
          },
          label: {
            content: `${idx + 1}`,
            color: '#fff',
            fontSize: 10,
            anchorX: -0.5,
            anchorY: -1
          }
        });
      }
    });

    // 签到范围圈
    const circles = [];
    if (teacherLat && teacherLng && range) {
      circles.push({
        latitude: teacherLat,
        longitude: teacherLng,
        radius: range,
        color: '#1677FF66',
        fillColor: '#1677FF1A',
        strokeWidth: 2
      });
    }

    // 确定地图中心
    if (teacherLat && teacherLng) {
      // 优先教师坐标
      this.setData({
        mapLat: teacherLat,
        mapLng: teacherLng,
        mapMarkers: markers,
        mapCircles: circles,
        mapScale: 17
      });
    } else if ((locationList || []).some(item => item.lat && item.lng)) {
      // 其次用第一个学生的坐标
      const first = (locationList || []).find(item => item.lat && item.lng);
      this.setData({
        mapLat: first.lat,
        mapLng: first.lng,
        mapMarkers: markers,
        mapCircles: circles,
        mapScale: 17
      });
    } else {
      // 都没有 → 先用默认值渲染，再让地图自己定位
      this.setData({
        mapLat: 0,
        mapLng: 0,
        mapMarkers: markers,
        mapCircles: circles,
        mapScale: 17
      });
      // 延迟调用 moveToLocation，等地图渲染完毕
      setTimeout(() => {
        const mapCtx = wx.createMapContext('locationMap', this);
        mapCtx.moveToLocation();
      }, 300);
    }
  },

  closeLocations() {
    // 恢复底部 tab-bar
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ tabBarHidden: false });

    this.setData({ showLocationsFor: null, locationList: [], showLocationMap: false, mapMarkers: [], mapCircles: [], currentTaskRange: 100 });
  },

  // 点击地图标记
  onMapMarkerTap(e) {
    const markerId = e.detail.markerId;
    if (markerId === 0) {
      wx.showToast({ title: '教师参考位置', icon: 'none' });
      return;
    }
    const student = this.data.locationList[markerId - 1];
    if (student) {
      wx.showToast({ title: `${student.name} (${student.sno})`, icon: 'none' });
    }
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

    // 找到对应任务获取教师位置和范围
    const task = (this.data.studentTasks || []).find(t => t.id == taskId);
    const teacherLat = task ? task.lat : 0;
    const teacherLng = task ? task.lng : 0;
    const range = task ? task.range : 100;

    this.setData({ locating: true, studentSignTaskId: taskId, studentMapRange: range });
    this._locationBusy = true;

    this._getLocation((lat, lng) => {
      that.setData({ myLat: lat, myLng: lng, locating: false, studentMapLat: lat, studentMapLng: lng });
      that._locationBusy = false;
      that._openStudentMap(lat, lng, teacherLat, teacherLng, range);
    }, () => {
      that.setData({ locating: false });
      that._locationBusy = false;
    });
  },

  // 打开学生端位置签到地图
  _openStudentMap(studentLat, studentLng, teacherLat, teacherLng, range) {
    const markers = [];

    // 学生位置标记
    markers.push({
      id: 0,
      latitude: studentLat,
      longitude: studentLng,
      width: 32,
      height: 32,
      callout: {
        content: '📍 我的位置',
        color: '#E74C3C',
        fontSize: 13,
        borderRadius: 8,
        padding: 6,
        display: 'ALWAYS'
      },
      label: {
        content: '我',
        color: '#E74C3C',
        fontSize: 12,
        anchorX: 0,
        anchorY: -12
      }
    });

    // 教师位置标记
    if (teacherLat && teacherLng) {
      markers.push({
        id: 1,
        latitude: teacherLat,
        longitude: teacherLng,
        width: 28,
        height: 28,
        callout: {
          content: '教师位置',
          color: '#1677FF',
          fontSize: 12,
          borderRadius: 6,
          padding: 4,
          display: 'ALWAYS'
        },
        label: {
          content: '教师',
          color: '#1677FF',
          fontSize: 12,
          anchorX: 0,
          anchorY: -12
        }
      });
    }

    // 范围圈
    const circles = [];
    if (teacherLat && teacherLng && range) {
      circles.push({
        latitude: teacherLat,
        longitude: teacherLng,
        radius: range,
        color: '#1677FF66',
        fillColor: '#1677FF1A',
        strokeWidth: 2
      });
    }

    // 隐藏 tab-bar
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ tabBarHidden: true });

    this.setData({
      studentMapVisible: true,
      studentMapTeacherLat: teacherLat,
      studentMapTeacherLng: teacherLng,
      studentMapMarkers: markers,
      studentMapCircles: circles,
      studentMapRange: range
    });
  },

  // 关闭学生端地图
  closeStudentMap() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.setData({ tabBarHidden: false });

    this.setData({
      studentMapVisible: false,
      studentMapMarkers: [],
      studentMapCircles: []
    });
  },

  // 在地图上确认签到
  confirmLocationCheckin() {
    const taskId = this.data.studentSignTaskId;
    const lat = this.data.myLat;
    const lng = this.data.myLng;
    if (!taskId) return;

    // 先关闭地图再签到
    this.closeStudentMap();
    this._doStudentSign(taskId, 'location', { lat: lat, lng: lng });
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

  // 删除历史签到任务
  deleteHistoryTask(e) {
    const taskId = e.currentTarget.dataset.id;
    const task = (this.data.historyTasks || []).find(t => t.id == taskId);
    const taskTitle = task ? task.title : '该签到任务';

    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${taskTitle}」及其所有签到记录吗？此操作不可恢复。`,
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          api.post('checkin/delete/', { task_id: taskId }).then(res => {
            if (res.code === 1) {
              wx.showToast({ title: '已删除', icon: 'success' });
              // 如果正在查看该任务的考勤，关闭弹窗
              if (this.data.showAttendanceFor == taskId) {
                this.setData({ showAttendanceFor: null, attendanceData: null });
              }
              this.loadHistory();
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
      isHighAccuracy: true,
      highAccuracyExpireTime: 15000,
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
