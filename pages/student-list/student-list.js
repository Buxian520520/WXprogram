/**
 * 学生列表页逻辑
 * 核心CRUD页面，支持搜索、分页、批量操作、Excel导入导出
 */

const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    // 数据
    students: [],           // 所有学生
    pageStudents: [],       // 当前页学生
    selectStudents: [],     // 已选中的学生

    // 搜索
    inputStr: '',

    // 分页
    total: 0,
    currentpage: 1,
    pagesize: 10,
    totalPages: 0,
    pageSizes: [5, 10, 50, 100],
    pageSizeIndex: 1,       // 默认索引 = pagessize 10

    // 角色 & 基础配置
    userRole: '',
    baseURL: api.BASE_URL,
    loading: false
  },

  // WXML 工具函数
  utils: {
    isSelected: function(arr, sno) {
      return arr.some(item => item.sno === sno);
    }
  },

  onLoad() {
    this.setData({
      userRole: app.globalData.userRole || 'student'
    });
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.syncSelected();
    // 每次进入页面刷新数据
    this.setData({
      userRole: app.globalData.userRole || 'student'
    });
    this.getStudents();
  },

  onPullDownRefresh() {
    this.getStudents().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ==================== 数据加载 ====================

  getStudents() {
    this.setData({ loading: true });
    const that = this;

    return api.get('students/')
      .then(res => {
        that.setData({ loading: false });
        if (res.code === 1) {
          const students = res.data || [];
          that.setData({
            students: students,
            total: students.length,
            totalPages: Math.ceil(students.length / that.data.pagesize) || 1
          });
          that.getPageStudents();
        } else {
          wx.showToast({ title: res.msg || '加载失败', icon: 'none' });
        }
      })
      .catch(err => {
        that.setData({ loading: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
  },

  getAllStudents() {
    this.setData({ inputStr: '' });
    this.getStudents();
  },

  // ==================== 搜索 ====================

  onSearchInput(e) {
    this.setData({ inputStr: e.detail.value });
  },

  queryStudents() {
    const inputstr = this.data.inputStr.trim();
    if (!inputstr) {
      this.getStudents();
      return;
    }

    this.setData({ loading: true });
    const that = this;

    api.post('students/query/', { inputstr: inputstr })
      .then(res => {
        that.setData({ loading: false });
        if (res.code === 1) {
          const students = res.data || [];
          that.setData({
            students: students,
            total: students.length,
            totalPages: Math.ceil(students.length / that.data.pagesize) || 1,
            currentpage: 1
          });
          that.getPageStudents();
        } else {
          wx.showToast({ title: res.msg || '查询失败', icon: 'none' });
        }
      })
      .catch(() => {
        that.setData({ loading: false });
        wx.showToast({ title: '查询失败', icon: 'none' });
      });
  },

  // ==================== 分页 ====================

  getPageStudents() {
    const { students, currentpage, pagesize } = this.data;
    const start = (currentpage - 1) * pagesize;
    const pageStudents = students.slice(start, start + pagesize);
    this.setData({
      pageStudents: pageStudents,
      selectStudents: []  // 换页清空选择
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
    this.getPageStudents();
  },

  prevPage() {
    if (this.data.currentpage > 1) {
      this.setData({ currentpage: this.data.currentpage - 1 });
      this.getPageStudents();
    }
  },

  nextPage() {
    if (this.data.currentpage < this.data.totalPages) {
      this.setData({ currentpage: this.data.currentpage + 1 });
      this.getPageStudents();
    }
  },

  // ==================== 选择 ====================

  toggleSelect(e) {
    const sno = e.currentTarget.dataset.sno;
    let selectStudents = [...this.data.selectStudents];
    const student = this.data.students.find(s => s.sno === sno);

    const idx = selectStudents.findIndex(s => s.sno === sno);
    if (idx > -1) {
      selectStudents.splice(idx, 1);
    } else if (student) {
      selectStudents.push(student);
    }

    this.setData({ selectStudents: selectStudents });
  },

  // 全选 / 取消全选（仅当前页）
  selectAll() {
    const { pageStudents, selectStudents } = this.data;
    // 如果当前页已全部选中 → 取消全选
    if (pageStudents.every(s => selectStudents.some(sel => sel.sno === s.sno))) {
      const pageSnos = new Set(pageStudents.map(s => s.sno));
      this.setData({
        selectStudents: selectStudents.filter(s => !pageSnos.has(s.sno))
      });
    } else {
      // 否则选中当前页全部（去重合并）
      const merged = [...selectStudents];
      pageStudents.forEach(s => {
        if (!merged.some(m => m.sno === s.sno)) {
          merged.push(s);
        }
      });
      this.setData({ selectStudents: merged });
    }
  },

  // ==================== 导航到表单 ====================

  addStudent() {
    wx.navigateTo({
      url: '/pages/student-form/student-form?mode=add'
    });
  },

  viewStudent(e) {
    const row = e.currentTarget.dataset.row;
    wx.navigateTo({
      url: '/pages/student-form/student-form?mode=view&sno=' + row.sno
    });
  },

  editStudent(e) {
    const row = e.currentTarget.dataset.row;
    wx.navigateTo({
      url: '/pages/student-form/student-form?mode=edit&sno=' + row.sno
    });
  },

  // ==================== 删除 ====================

  deleteStudent(e) {
    const row = e.currentTarget.dataset.row;
    const that = this;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除学生【学号: ${row.sno} 姓名: ${row.name}】吗？`,
      confirmColor: '#F53F3F',
      success(res) {
        if (res.confirm) {
          api.post('student/delete/', { sno: row.sno })
            .then(res => {
              if (res.code === 1) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                // 更新本地数据
                const newStudents = that.data.students.filter(s => s.sno !== row.sno);
                that.setData({
                  students: newStudents,
                  total: newStudents.length,
                  totalPages: Math.ceil(newStudents.length / that.data.pagesize) || 1
                });
                that.getPageStudents();
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

  batchDeleteStudents() {
    const count = this.data.selectStudents.length;
    const that = this;

    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${count} 条学生记录吗？`,
      confirmColor: '#F53F3F',
      success(res) {
        if (res.confirm) {
          api.post('students/delete/', { student: that.data.selectStudents })
            .then(res => {
              if (res.code === 1) {
                wx.showToast({ title: `成功删除 ${count} 条`, icon: 'success' });
                that.setData({
                  students: res.data || [],
                  total: (res.data || []).length,
                  totalPages: Math.ceil((res.data || []).length / that.data.pagesize) || 1,
                  currentpage: 1
                });
                that.getPageStudents();
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

  // ==================== Excel 操作 ====================

  importExcel() {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success(res) {
        const filePath = res.tempFiles[0].path;
        wx.showLoading({ title: '导入中...' });

        api.uploadExcel(filePath)
          .then(data => {
            wx.hideLoading();
            const msg = `导入完成!\n成功: ${data.success} 条\n失败: ${data.error} 条`;
            wx.showModal({
              title: '导入结果',
              content: msg,
              showCancel: false,
              success() {
                that.getStudents(); // 刷新列表
              }
            });
            if (data.errors && data.errors.length > 0) {
              console.log('失败学号:', data.errors);
            }
          })
          .catch(err => {
            wx.hideLoading();
            wx.showToast({ title: err.msg || '导入失败', icon: 'none' });
          });
      }
    });
  },

  exportExcel() {
    const that = this;
    // 先让用户选择操作，确认后再导出
    wx.showActionSheet({
      itemList: ['导出并打开文件'],
      itemColor: '#1677FF',
      success() {
        that._doExport();
      }
    });
  },

  _doExport() {
    wx.showLoading({ title: '导出中...' });
    const token = api.getAccessToken();

    wx.downloadFile({
      url: api.BASE_URL + 'excel/export/',
      header: token ? { 'Authorization': 'Bearer ' + token } : {},
      success: (downloadRes) => {
        wx.hideLoading();
        if (downloadRes.statusCode === 200) {
          // 保存到本地后再打开，用户可在查看器中自行保存/转发
          wx.openDocument({
            filePath: downloadRes.tempFilePath,
            fileType: 'xlsx',
            success() {
              wx.showToast({ title: '导出成功', icon: 'success' });
            },
            fail() {
              wx.showToast({ title: '请安装Office查看', icon: 'none' });
            }
          });
        } else if (downloadRes.statusCode === 401) {
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
        } else {
          try {
            const data = JSON.parse(downloadRes.data);
            wx.showToast({ title: data.msg || '导出失败', icon: 'none' });
          } catch (e) {
            wx.showToast({ title: '导出失败', icon: 'none' });
          }
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败，请检查网络', icon: 'none' });
      }
    });
  }
});
