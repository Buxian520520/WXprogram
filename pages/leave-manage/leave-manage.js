/**
 * 请假管理页（教师端）逻辑
 * 查看所有请假、搜索筛选、批准/拒绝、批量删除
 */

const api = require('../../utils/api');

Page({
  data: {
    // 数据
    leaves: [],
    pageLeaves: [],
    selectLeaves: [],

    // 筛选
    filterName: '',
    statusIndex: 0,
    statusOptions: ['全部状态', '待审批', '已批准', '已拒绝'],

    // 分页
    total: 0,
    currentpage: 1,
    pagesize: 10,
    totalPages: 0,
    pageSizes: [5, 10, 50, 100],
    pageSizeIndex: 1,

    // 对话框
    showApprovalDialog: false,
    showDetailDialog: false,
    approvalType: 'approve', // 'approve' | 'reject'
    approvalComment: '',
    currentLeave: null,
    detailLeave: {},
    submitting: false,
    loading: false
  },

  utils: {
    isSelected(arr, id) {
      return arr.some(item => item.id === id);
    }
  },

  onShow() {
    this.loadLeaves();
  },

  // ==================== 数据加载 ====================

  loadLeaves() {
    this.setData({ loading: true });
    const that = this;

    const params = {};
    if (this.data.filterName) {
      params.student_name = this.data.filterName;
    }
    const statusMap = ['', 'pending', 'approved', 'rejected'];
    const status = statusMap[this.data.statusIndex];
    if (status) {
      params.status = status;
    }

    api.get('leaves/', params)
      .then(res => {
        that.setData({ loading: false });
        if (res.code === 1) {
          const leaves = res.data || [];
          that.setData({
            leaves: leaves,
            total: leaves.length,
            totalPages: Math.ceil(leaves.length / that.data.pagesize) || 1,
            currentpage: 1
          });
          that.getPageLeaves();
        } else {
          wx.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      })
      .catch(() => {
        that.setData({ loading: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
  },

  // ==================== 筛选 ====================

  onFilterNameChange(e) {
    this.setData({ filterName: e.detail.value });
  },

  onStatusChange(e) {
    this.setData({ statusIndex: parseInt(e.detail.value) });
  },

  queryLeaves() {
    this.loadLeaves();
  },

  resetQuery() {
    this.setData({ filterName: '', statusIndex: 0 });
    this.loadLeaves();
  },

  // ==================== 分页 ====================

  getPageLeaves() {
    const { leaves, currentpage, pagesize } = this.data;
    const start = (currentpage - 1) * pagesize;
    this.setData({
      pageLeaves: leaves.slice(start, start + pagesize),
      selectLeaves: []
    });
  },

  onPageSizeChange(e) {
    const idx = parseInt(e.detail.value);
    const pagesize = this.data.pageSizes[idx];
    this.setData({
      pageSizeIndex: idx,
      pagesize: pagesize,
      currentpage: 1,
      totalPages: Math.ceil(this.data.total / pagesize) || 1
    });
    this.getPageLeaves();
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

  // ==================== 选择 ====================

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    let selectLeaves = [...this.data.selectLeaves];
    const leave = this.data.leaves.find(l => l.id === id);

    const idx = selectLeaves.findIndex(l => l.id === id);
    if (idx > -1) {
      selectLeaves.splice(idx, 1);
    } else if (leave) {
      selectLeaves.push(leave);
    }

    this.setData({ selectLeaves });
  },

  // 全选 / 取消全选（仅当前页）
  selectAll() {
    const { pageLeaves, selectLeaves } = this.data;
    if (pageLeaves.every(l => selectLeaves.some(sel => sel.id === l.id))) {
      // 已全选 → 取消当前页选中
      const pageIds = new Set(pageLeaves.map(l => l.id));
      this.setData({
        selectLeaves: selectLeaves.filter(l => !pageIds.has(l.id))
      });
    } else {
      // 合并选中当前页全部
      const merged = [...selectLeaves];
      pageLeaves.forEach(l => {
        if (!merged.some(m => m.id === l.id)) {
          merged.push(l);
        }
      });
      this.setData({ selectLeaves: merged });
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

  // ==================== 审批 ====================

  approveLeave(e) {
    this.setData({
      showApprovalDialog: true,
      approvalType: 'approve',
      approvalComment: '',
      currentLeave: e.currentTarget.dataset.row
    });
  },

  rejectLeave(e) {
    this.setData({
      showApprovalDialog: true,
      approvalType: 'reject',
      approvalComment: '',
      currentLeave: e.currentTarget.dataset.row
    });
  },

  approveFromDetail() {
    this.setData({
      showApprovalDialog: true,
      approvalType: 'approve',
      approvalComment: '',
      currentLeave: this.data.detailLeave
    });
  },

  rejectFromDetail() {
    this.setData({
      showApprovalDialog: true,
      approvalType: 'reject',
      approvalComment: '',
      currentLeave: this.data.detailLeave
    });
  },

  onApprovalComment(e) {
    this.setData({ approvalComment: e.detail.value });
  },

  closeApprovalDialog() {
    this.setData({ showApprovalDialog: false });
  },

  submitApproval() {
    const { approvalType, approvalComment, currentLeave } = this.data;
    if (!currentLeave) return;

    const url = approvalType === 'approve' ? 'leave/approve/' : 'leave/reject/';
    this.setData({ submitting: true });
    const that = this;

    api.post(url, {
      leaveId: currentLeave.id,
      comment: approvalComment
    }).then(res => {
      that.setData({ submitting: false });
      if (res.code === 1) {
        wx.showToast({
          title: approvalType === 'approve' ? '已批准' : '已拒绝',
          icon: 'success'
        });
        that.setData({
          showApprovalDialog: false,
          showDetailDialog: false
        });
        that.loadLeaves();
      } else {
        wx.showToast({ title: res.msg || '操作失败', icon: 'none' });
      }
    }).catch(() => {
      that.setData({ submitting: false });
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  // ==================== 批量删除 ====================

  batchDelete() {
    const count = this.data.selectLeaves.length;
    const that = this;

    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${count} 条请假记录吗？`,
      confirmColor: '#F53F3F',
      success(res) {
        if (res.confirm) {
          const ids = that.data.selectLeaves.map(l => l.id);
          api.post('leave/delete/', { leaveIds: ids })
            .then(res => {
              if (res.code === 1) {
                wx.showToast({ title: `已删除 ${count} 条`, icon: 'success' });
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

  // ==================== 事件冒泡阻止 ====================

  stopPropagation() {
    // 阻止事件冒泡，用于对话框点击不关闭
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
