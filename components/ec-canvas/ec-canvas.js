/**
 * ec-canvas 组件
 * 基于 echarts-for-weixin (ecomfe/echarts-for-weixin)
 * 为微信小程序 Canvas 2D 接口适配的 ECharts 组件
 */

const app = getApp();

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object,
      value: {}
    },
    width: {
      type: String,
      value: '100%'
    },
    height: {
      type: String,
      value: '400rpx'
    },
    useNewCanvas: {
      type: Boolean,
      value: true
    }
  },

  data: {
    chart: null
  },

  lifetimes: {
    attached() {
      // 组件挂载
    },
    detached() {
      // 组件销毁时释放 chart 实例
      if (this.data.chart) {
        try {
          this.data.chart.dispose();
        } catch (e) {}
        this.data.chart = null;
      }
    }
  },

  methods: {
    /**
     * Canvas 初始化回调（旧版）
     */
    canvasInit(e) {
      // 旧版兼容
    },

    /**
     * Canvas 2D ready 回调
     */
    onCanvasReady() {
      // 如果已经初始化过则跳过
      if (this.data.chart) return;
      this.initChart();
    },

    /**
     * 初始化图表
     */
    init(callback) {
      // 保存初始化回调
      this._initCallback = callback;
      if (this.data.useNewCanvas) {
        // 新版 Canvas 2D: canvas ready 后自动调用
        this.initChart();
      }
    },

    async initChart() {
      if (!this._initCallback) return;

      const query = this.createSelectorQuery();
      query.select('#canvas-' + this.data.canvasId)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            // Canvas 节点未准备好，延迟重试
            setTimeout(() => this.initChart(), 100);
            return;
          }

          const canvasNode = res[0].node;
          const width = res[0].width;
          const height = res[0].height;
          const dpr = wx.getSystemInfoSync().pixelRatio;

          canvasNode.width = width * dpr;
          canvasNode.height = height * dpr;

          try {
            const echarts = require('../../libs/echarts.min');
            const chart = echarts.init(canvasNode, null, {
              width: width,
              height: height,
              devicePixelRatio: dpr
            });

            // 调用用户的初始化回调
            this._initCallback(chart, width, height, dpr);
            this.setData({ chart: chart });
          } catch (e) {
            console.error('ECharts 初始化失败:', e);
            console.error('请确保 libs/echarts.min.js 文件存在');
          }
        });
    },

    /**
     * 获取图表实例
     */
    getChart() {
      return this.data.chart;
    }
  }
});
