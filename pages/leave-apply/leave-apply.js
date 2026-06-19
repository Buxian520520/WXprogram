/**
 * 我的请假页（学生端）逻辑
 * 申请请假 + 查看自己的请假历史
 */

const api = require('../../utils/api');
const validator = require('../../utils/validator');

Page({
  data: {
    showForm: true,

    // 请假表单
    leaveForm: {
      leaveType: '',
      startDate: '',
      endDate: '',
      reason: ''
    },
    leaveTypes: ['事假', '病假', '其他'],
    leaveTypeIndex: -1,
    errors: {},

    // 记录
    leaves: [],
    pageLeaves: [],
    statusIndex: 0,
    statusOptions: ['全部', '待审批', '已批准', '已拒绝'],

    // 分页
    total: 0,
    currentpage: 1,
    pagesize: 10,
    totalPages: 0,

    // 对话框
    showDetailDialog: false,
    detailLeave: {},

    // 状态
    submitting: false,
    loading: false
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.syncSelected();
    this.loadLeaves();
  },

  // ==================== 表单切换 ====================

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },

  // ==================== 表单字段 ====================

  onLeaveTypeChange(e) {
    this.setData({
      leaveTypeIndex: parseInt(e.detail.value),
      'leaveForm.leaveType': this.data.leaveTypes[parseInt(e.detail.value)],
      'errors.leaveType': ''
    });
  },

  onStartDateChange(e) {
    this.setData({
      'leaveForm.startDate': e.detail.value,
      'errors.startDate': ''
    });
  },

  onEndDateChange(e) {
    this.setData({
      'leaveForm.endDate': e.detail.value,
      'errors.endDate': ''
    });
  },

  onReasonChange(e) {
    this.setData({
      'leaveForm.reason': e.detail.value,
      'errors.reason': ''
    });
  },

  // ==================== 提交请假 ====================

  submitLeave() {
    const { leaveForm } = this.data;
    const result = validator.validateLeaveForm(leaveForm);

    if (!result.valid) {
      this.setData({ errors: result.errors });
      wx.showToast({ title: '请检查表单信息', icon: 'none' });
      return;
    }

    this.setData({ submitting: true, errors: {} });
    const that = this;

    api.post('leave/apply/', {
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason
    }).then(res => {
      that.setData({ submitting: false });
      if (res.code === 1) {
        wx.showToast({ title: '请假申请已提交', icon: 'success' });
        // 重置表单
        that.setData({
          leaveForm: { leaveType: '', startDate: '', endDate: '', reason: '' },
          leaveTypeIndex: -1
        });
        that.loadLeaves();
      } else {
        wx.showToast({ title: res.msg || '提交失败', icon: 'none' });
      }
    }).catch(() => {
      that.setData({ submitting: false });
      wx.showToast({ title: '提交失败', icon: 'none' });
    });
  },

  // ==================== 加载记录 ====================

  loadLeaves() {
    this.setData({ loading: true });
    const that = this;

    api.get('leaves/')
      .then(res => {
        that.setData({ loading: false });
        if (res.code === 1) {
          let leaves = res.data || [];
          // 本地筛选状态
          const statusMap = ['', 'pending', 'approved', 'rejected'];
          const filterStatus = statusMap[that.data.statusIndex];
          if (filterStatus) {
            leaves = leaves.filter(l => l.status === filterStatus);
          }
          that.setData({
            leaves: leaves,
            total: leaves.length,
            totalPages: Math.ceil(leaves.length / that.data.pagesize) || 1,
            currentpage: 1
          });
          that.getPageLeaves();
        }
      })
      .catch(() => {
        that.setData({ loading: false });
      });
  },

  onStatusFilterChange(e) {
    this.setData({
      statusIndex: parseInt(e.detail.value),
      currentpage: 1
    });
    this.loadLeaves();
  },

  // ==================== 分页 ====================

  getPageLeaves() {
    const { leaves, currentpage, pagesize } = this.data;
    const start = (currentpage - 1) * pagesize;
    this.setData({
      pageLeaves: leaves.slice(start, start + pagesize)
    });
  },

  prevPage() {
    if (this.data.currentpage > 1) {
      this.setData({ currentpage: this.data.currentpage - 1 });
      this.getPageLeaves();
    }
  },

  nextPage() {
    if (this.data.currentpage < this.data.totalPages) {
      this.setData({ currentpage: this.data.currentpage + 1 });
      this.getPageLeaves();
    }
  },

  // ==================== 查看详情 ====================

  viewDetail(e) {
    this.setData({
      showDetailDialog: true,
      detailLeave: e.currentTarget.dataset.row
    });
  },

  closeDetailDialog() {
    this.setData({ showDetailDialog: false });
  },

  // ==================== 删除请假 ====================

  deleteLeave(e) {
    const row = e.currentTarget.dataset.row;
    const that = this;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条请假记录吗？',
      confirmColor: '#F53F3F',
      success(res) {
        if (res.confirm) {
          api.post('leave/delete/', { leaveIds: [row.id] })
            .then(res => {
              if (res.code === 1) {
                wx.showToast({ title: '已删除', icon: 'success' });
                that.loadLeaves();
              } else {
                wx.showToast({ title: res.msg || '删除失败', icon: 'none' });
              }
            })
            .catch(() => {
              wx.showToast({ title: '删除失败', icon: 'none' });
            });
        }
      }
    });
  },

  stopPropagation() {}
});
