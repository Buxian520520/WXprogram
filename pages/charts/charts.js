/**
 * 图表页逻辑（教师）/ 请假模块（学生）
 * 教师：加载4个图表数据，优先使用 ECharts，降级使用简易 Canvas 绘制
 * 学生：请假申请 + 查看自己的请假记录
 */

const api = require('../../utils/api');
const validator = require('../../utils/validator');
const app = getApp();

// 尝试加载 ECharts
let echarts = null;
try {
  echarts = require('../../libs/echarts.min');
} catch (e) {
  console.log('ECharts 未安装，使用简易 Canvas 降级方案');
}

Page({
  data: {
    // ===== 角色 =====
    userRole: '',

    // ===== 图表数据（教师） =====
    useECharts: false,
    loading: true,

    ecGender: {},
    ecAge: {},
    ecBirthday: {},
    ecLeave: {},

    genderData: [],
    ageData: [],
    birthdayData: [],
    leaveData: [],

    // ===== 请假模块数据（学生） =====
    showForm: true,

    leaveForm: {
      leaveType: '',
      startDate: '',
      endDate: '',
      reason: ''
    },
    leaveTypes: ['事假', '病假', '其他'],
    leaveTypeIndex: -1,
    errors: {},

    leaves: [],
    pageLeaves: [],
    statusIndex: 0,
    statusOptions: ['全部', '待审批', '已批准', '已拒绝'],

    leaveTotal: 0,
    leaveCurrentpage: 1,
    leavePagesize: 10,
    leaveTotalPages: 0,

    showDetailDialog: false,
    detailLeave: {},

    submitting: false,
    leaveLoading: false
  },

  onLoad() {
    const role = app.globalData.userRole || 'student';
    this.setData({
      userRole: role,
      useECharts: !!echarts
    });
    if (role === 'teacher') {
      this.loadAllData();
    }
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar) tabBar.syncSelected();
    const role = app.globalData.userRole || 'student';
    this.setData({ userRole: role });
    if (role === 'teacher') {
      // 首次加载由 onLoad 处理，后续切换 Tab 时刷新图表
      if (this._hasLoaded) {
        this.loadAllData();
      }
      this._hasLoaded = true;
    } else {
      this.loadLeaves();
    }
  },

  onReady() {
    if (this.data.userRole !== 'teacher') return;
    if (echarts) {
      this.initECharts();
    } else {
      setTimeout(() => {
        this.drawAllSimpleCharts();
      }, 500);
    }
  },

  // ==================== 教师：数据加载 ====================

  loadAllData() {
    this.setData({ loading: true });
    Promise.all([
      api.get('getSourceChartData/'),
      api.get('getAgeChartData/'),
      api.get('getTypeChartData/'),
      api.get('getLeaveTrendData/')
    ]).then(([gender, age, birthday, leave]) => {
      this.setData({
        loading: false,
        genderData: (gender.code === 1 ? gender.data : []) || [],
        ageData: (age.code === 1 ? age.data : []) || [],
        birthdayData: (birthday.code === 1 ? birthday.data : []) || [],
        leaveData: (leave.code === 1 ? leave.data : []) || []
      });

      if (echarts) {
        this.initECharts();
      } else {
        setTimeout(() => this.drawAllSimpleCharts(), 300);
      }
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    });
  },

  // ==================== 教师：ECharts 初始化 ====================

  initECharts() {
    if (!echarts) return;

    const { genderData, ageData, birthdayData, leaveData } = this.data;

    // 性别饼图
    this.setData({
      ecGender: {
        onInit: (canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          chart.setOption({
            tooltip: { trigger: 'item' },
            legend: { bottom: 0, left: 'center', textStyle: { fontSize: 10 } },
            series: [{
              type: 'pie',
              radius: ['45%', '70%'],
              center: ['50%', '45%'],
              data: genderData,
              label: { fontSize: 10, formatter: '{b}\n{d}%' }
            }]
          });
          return chart;
        }
      }
    });

    // 年龄饼图
    this.setData({
      ecAge: {
        onInit: (canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          chart.setOption({
            tooltip: { trigger: 'item' },
            legend: { bottom: 0, left: 'center', textStyle: { fontSize: 10 } },
            series: [{
              type: 'pie',
              radius: ['45%', '70%'],
              center: ['50%', '45%'],
              data: ageData,
              label: { fontSize: 10, formatter: '{b}\n{d}%' }
            }]
          });
          return chart;
        }
      }
    });

    // 生日月份柱状图
    this.setData({
      ecBirthday: {
        onInit: (canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { top: 20, left: 40, right: 20, bottom: 30 },
            xAxis: {
              type: 'category',
              data: birthdayData.map(d => d.name),
              axisLabel: { fontSize: 9, rotate: 30 }
            },
            yAxis: { type: 'value' },
            series: [{
              type: 'bar',
              data: birthdayData.map(d => d.value),
              itemStyle: { color: '#1677FF' }
            }]
          });
          return chart;
        }
      }
    });

    // 请假趋势折线图
    this.setData({
      ecLeave: {
        onInit: (canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { top: 20, left: 40, right: 20, bottom: 30 },
            xAxis: {
              type: 'category',
              data: leaveData.map(d => {
                const s = d.name || '';
                return s.length >= 10 ? s.slice(5) : s;
              }),
              axisLabel: { fontSize: 9, rotate: 30 }
            },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{
              type: 'line',
              smooth: true,
              data: leaveData.map(d => d.value),
              itemStyle: { color: '#00B42A' },
              areaStyle: { color: 'rgba(0,180,42,0.12)' }
            }]
          });
          return chart;
        }
      }
    });
  },

  // ==================== 教师：简易 Canvas 降级方案 ====================

  drawAllSimpleCharts() {
    if (echarts) return;

    this.drawPieChart('gender-canvas', this.data.genderData, ['#1677FF', '#FF7D7D']);
    this.drawPieChart('age-canvas', this.data.ageData, ['#00B42A', '#FF7D00', '#1677FF', '#F53F3F', '#722ED1', '#13C2C2', '#FADB14']);
    this.drawBarChart('birthday-canvas', this.data.birthdayData);
    this.drawLineChart('leave-canvas', this.data.leaveData);
  },

  drawPieChart(canvasId, data, colors) {
    const query = wx.createSelectorQuery();
    query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const cx = width / 2;
      const cy = height / 2 + 20;
      const radius = Math.min(width, height) / 2 - 55;

      if (!data || data.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', cx, cy);
        return;
      }

      const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
      if (total === 0) return;

      let startAngle = -Math.PI / 2;
      data.forEach((item, i) => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();

        const midAngle = startAngle + sliceAngle / 2;
        const pct = Math.round((item.value / total) * 100);
        const labelDist = pct < 8 ? radius + 30 : radius + 20;
        const labelX = cx + Math.cos(midAngle) * labelDist;
        const labelY = cy + Math.sin(midAngle) * labelDist;

        ctx.fillStyle = '#333';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.name}: ${item.value}(${pct}%)`, labelX, labelY);

        startAngle += sliceAngle;
      });
    });
  },

  drawBarChart(canvasId, data) {
    const query = wx.createSelectorQuery();
    query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      if (!data || data.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
      }

      const padLeft = 40, padRight = 20, padTop = 20, padBottom = 40;
      const chartW = width - padLeft - padRight;
      const chartH = height - padTop - padBottom;
      const maxVal = Math.max(...data.map(d => d.value || 0), 1);
      const barW = Math.min(chartW / data.length - 6, 30);

      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
      }

      data.forEach((item, i) => {
        const barH = ((item.value || 0) / maxVal) * chartH;
        const x = padLeft + (chartW / data.length) * i + (chartW / data.length - barW) / 2;
        const y = padTop + chartH - barH;

        ctx.fillStyle = '#1677FF';
        ctx.fillRect(x, y, barW, barH);

        ctx.fillStyle = '#666';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.name || '', x + barW / 2, padTop + chartH + 15);

        if (item.value > 0) {
          ctx.fillStyle = '#333';
          ctx.font = '10px sans-serif';
          ctx.fillText(String(item.value), x + barW / 2, y - 4);
        }
      });
    });
  },

  drawLineChart(canvasId, data) {
    const query = wx.createSelectorQuery();
    query.select('#' + canvasId).fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      if (!data || data.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('暂无数据', width / 2, height / 2);
        return;
      }

      const padLeft = 45, padRight = 20, padTop = 20, padBottom = 40;
      const chartW = width - padLeft - padRight;
      const chartH = height - padTop - padBottom;
      const maxVal = Math.max(...data.map(d => d.value || 0), 1);

      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();
      }

      if (data.length < 2) return;
      const stepX = chartW / (data.length - 1);
      const points = data.map((d, i) => ({
        x: padLeft + stepX * i,
        y: padTop + chartH - ((d.value || 0) / maxVal) * chartH
      }));

      ctx.beginPath();
      ctx.moveTo(points[0].x, padTop + chartH);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, padTop + chartH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,180,42,0.12)';
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = '#00B42A';
      ctx.lineWidth = 2;
      points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00B42A';
        ctx.fill();
      });

      ctx.fillStyle = '#999';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      const maxLabels = Math.min(data.length, 8);
      for (let i = 0; i < maxLabels; i++) {
        const idx = Math.round((i / (maxLabels - 1)) * (data.length - 1));
        const label = (data[idx].name || '').length >= 10 ? (data[idx].name || '').slice(5) : (data[idx].name || '');
        ctx.fillText(label, points[idx].x, padTop + chartH + 15);
      }
    });
  },

  // ==================== 学生：请假表单切换 ====================

  toggleForm() {
    this.setData({ showForm: !this.data.showForm });
  },

  // ==================== 学生：请假表单字段 ====================

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

  // ==================== 学生：提交请假 ====================

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

  // ==================== 学生：加载请假记录 ====================

  loadLeaves() {
    this.setData({ leaveLoading: true });
    const that = this;

    api.get('leaves/')
      .then(res => {
        that.setData({ leaveLoading: false });
        if (res.code === 1) {
          let leaves = res.data || [];
          const statusMap = ['', 'pending', 'approved', 'rejected'];
          const filterStatus = statusMap[that.data.statusIndex];
          if (filterStatus) {
            leaves = leaves.filter(l => l.status === filterStatus);
          }
          that.setData({
            leaves: leaves,
            leaveTotal: leaves.length,
            leaveTotalPages: Math.ceil(leaves.length / that.data.leavePagesize) || 1,
            leaveCurrentpage: 1
          });
          that.getPageLeaves();
        }
      })
      .catch(() => {
        that.setData({ leaveLoading: false });
      });
  },

  onStatusFilterChange(e) {
    this.setData({
      statusIndex: parseInt(e.detail.value),
      leaveCurrentpage: 1
    });
    this.loadLeaves();
  },

  // ==================== 学生：请假分页 ====================

  getPageLeaves() {
    const { leaves, leaveCurrentpage, leavePagesize } = this.data;
    const start = (leaveCurrentpage - 1) * leavePagesize;
    this.setData({
      pageLeaves: leaves.slice(start, start + leavePagesize)
    });
  },

  prevLeavePage() {
    if (this.data.leaveCurrentpage > 1) {
      this.setData({ leaveCurrentpage: this.data.leaveCurrentpage - 1 });
      this.getPageLeaves();
    }
  },

  nextLeavePage() {
    if (this.data.leaveCurrentpage < this.data.leaveTotalPages) {
      this.setData({ leaveCurrentpage: this.data.leaveCurrentpage + 1 });
      this.getPageLeaves();
    }
  },

  // ==================== 学生：请假详情/删除 ====================

  viewLeaveDetail(e) {
    this.setData({
      showDetailDialog: true,
      detailLeave: e.currentTarget.dataset.row
    });
  },

  closeDetailDialog() {
    this.setData({ showDetailDialog: false });
  },

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
