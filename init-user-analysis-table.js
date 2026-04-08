// 用户分析表格动态渲染功能
(function () {
    console.log('开始初始化用户分析表格...');

    // 将初始化函数暴露到全局作用域
    window.initUserAnalysisTable = initUserAnalysisTable;

    // 24小时权重配置（从配置文件加载）
    let HOURLY_WEIGHTS = {};

    // 加载权重配置文件
    async function loadHourlyWeights() {
        const response = await fetch('./conf/hourly-weights.json');
        const config = await response.json();
        HOURLY_WEIGHTS = config.hourlyWeights;
    }

    // 验证权重总和是否接近 1
    const weightSum = Object.values(HOURLY_WEIGHTS).reduce((sum, w) => sum + w, 0);
    console.log('小时权重总和:', weightSum.toFixed(4), '(应接近 1.0)');

    /**
     * 将天数据转换为小时数据
     * @param {Array} dailyData - 按天的数据数组
     * @returns {Array} - 按小时的数据数组（只返回第一天的24小时数据用于表格展示）
     */
    function convertDailyToHourly(dailyData) {
        // 获取昨天的日期（格式：MM/DD）
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${month}/${day}`;

        console.log('查找昨天的日期:', yesterdayStr);

        // 在数据中查找昨天的数据
        const yesterdayData = dailyData.find(item => item.date === yesterdayStr);

        if (!yesterdayData) {
            console.warn(`未找到 ${yesterdayStr} 的数据`);
            return [];
        }

        console.log('使用日期:', yesterdayData.date, '的数据生成小时分布');

        const hourlyData = [];

        // 为这一天生成24小时的数据
        for (let hour = 0; hour < 24; hour++) {
            const hourKey = String(hour).padStart(2, '0');
            const timeStr = `${hourKey}:00:00`;
            const weight = HOURLY_WEIGHTS[hourKey];

            // 根据权重分配各项指标
            hourlyData.push({
                time: timeStr,
                activeUsers: Math.max(1, Math.round(yesterdayData.dailyUsers * weight)),
                newUsers: Math.max(1, Math.round(yesterdayData.newUsers * weight)),
                totalUsers: Math.max(1, Math.round(yesterdayData.totalUser * weight)),
                shares: Math.max(1, Math.round(yesterdayData.totalShares * weight)),
                shareSuccessUsers: Math.max(1, Math.round(yesterdayData.shareSuccessUsers * weight)),
                shareNewUsers: Math.max(1, Math.round(yesterdayData.shareNewUsers * weight)),
                shareSuccess: Math.max(1, Math.round(yesterdayData.shareSuccess * weight)),
                startup: Math.max(1, Math.round(yesterdayData.startup * weight)),
                avgStartup: Math.round(yesterdayData.avgStartup * weight),
                avgDuration: Math.round(yesterdayData.avgDuration * weight), // 秒数，后续格式化
                singleAvgDuration: Math.round(yesterdayData.singleAvgDuration * weight) // 秒数，后续格式化
            });
        }

        console.log('✅ 已生成', hourlyData.length, '条小时数据');
        return hourlyData;
    }

    /**
     * 格式化时间显示（秒转 HH:MM:SS）
     */
    function formatTime(seconds) {
        if (typeof seconds !== 'number') return '00:00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            String(hours).padStart(2, '0'),
            String(minutes).padStart(2, '0'),
            String(secs).padStart(2, '0')
        ].join(':');
    }

    /**
     * 格式化数字（添加千位分隔符）
     */
    function formatNumber(num) {
        if (typeof num !== 'number') return '0';
        return num.toLocaleString('zh-CN');
    }

    // 分页状态
    let currentPage = 1;
    const pageSize = 10;
    let allHourlyData = [];

    /**
     * 渲染表格内容（支持分页）
     */
    function renderTable(hourlyData, page = 1) {
        const tbody = document.querySelector('.semi-dy-open-table-tbody');
        if (!tbody) {
            console.warn('未找到表格 tbody 元素');
            return;
        }

        // 保存所有数据
        allHourlyData = hourlyData;
        currentPage = page;

        // 计算分页
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, hourlyData.length);
        const pageData = hourlyData.slice(startIndex, endIndex);

        // 清空现有内容
        tbody.innerHTML = '';

        // 生成当前页的表格行
        pageData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('role', 'row');
            tr.setAttribute('aria-rowindex', startIndex + index + 1);
            tr.className = 'semi-dy-open-table-row';
            tr.setAttribute('data-row-key', startIndex + index);

            // 构建每一列的 HTML
            tr.innerHTML = `
                <td role="gridcell" aria-colindex="1"
                    class="semi-dy-open-table-row-cell semi-dy-open-table-cell-fixed-left semi-dy-open-table-cell-fixed-left-last"
                    title="${row.time}" style="left: 0px;">${row.time}</td>
                <td role="gridcell" aria-colindex="2" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.activeUsers)}">${formatNumber(row.activeUsers)}</td>
                <td role="gridcell" aria-colindex="3" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.newUsers)}">${formatNumber(row.newUsers)}</td>
                <td role="gridcell" aria-colindex="4" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.totalUsers)}">${formatNumber(row.totalUsers)}</td>
                <td role="gridcell" aria-colindex="5" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.shares)}">${formatNumber(row.shares)}</td>
                <td role="gridcell" aria-colindex="6" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.shareSuccessUsers)}">${formatNumber(row.shareSuccessUsers)}</td>
                <td role="gridcell" aria-colindex="7" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.shareNewUsers)}">${formatNumber(row.shareNewUsers)}</td>
                <td role="gridcell" aria-colindex="8" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.shareSuccess)}">${formatNumber(row.shareSuccess)}</td>
                <td role="gridcell" aria-colindex="9" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(row.startup)}">${formatNumber(row.startup)}</td>
                <td role="gridcell" aria-colindex="10" class="semi-dy-open-table-row-cell">
                    ${row.avgStartup.toFixed(3)}</td>
                <td role="gridcell" aria-colindex="11" class="semi-dy-open-table-row-cell"
                    title="${formatTime(row.avgDuration)}">${formatTime(row.avgDuration)}</td>
                <td role="gridcell" aria-colindex="12"
                    class="semi-dy-open-table-row-cell semi-dy-open-table-cell-fixed-right semi-dy-open-table-cell-fixed-right-first"
                    title="${formatTime(row.singleAvgDuration)}" style="right: 0px;">${formatTime(row.singleAvgDuration)}</td>
            `;

            tbody.appendChild(tr);
        });

        // 更新分页信息
        updatePagination(hourlyData.length, page);

        console.log(`✅ 表格渲染完成，第${page}页，显示 ${startIndex + 1}-${endIndex} 条，共 ${hourlyData.length} 条`);
    }

    /**
     * 更新分页信息
     */
    function updatePagination(totalCount, currentPage) {
        const paginationInfo = document.querySelector('.semi-dy-open-table-pagination-info');
        if (paginationInfo) {
            const startIndex = (currentPage - 1) * pageSize + 1;
            const endIndex = Math.min(currentPage * pageSize, totalCount);

            // 更新显示文本
            paginationInfo.textContent = `显示第 ${startIndex} 条-第 ${endIndex} 条，共 ${totalCount} 条`;
        }

        // 更新页码按钮
        updatePageButtons(totalCount, currentPage);

        console.log(`✅ 分页信息已更新: 第${currentPage}页`);
    }

    /**
     * 更新页码按钮状态
     */
    function updatePageButtons(totalCount, currentPage) {
        const totalPages = Math.ceil(totalCount / pageSize);
        const pageList = document.querySelector('.semi-dy-open-page');
        if (!pageList) return;

        // 清空现有的页码按钮（保留上一页和下一页）
        const existingPages = pageList.querySelectorAll('.semi-dy-open-page-item:not(.semi-dy-open-page-prev):not(.semi-dy-open-page-next)');
        existingPages.forEach(item => item.remove());

        // 动态生成页码按钮
        const nextBtn = pageList.querySelector('.semi-dy-open-page-next');
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = 'semi-dy-open-page-item';
            li.setAttribute('aria-label', `Page ${i}`);
            li.setAttribute('aria-current', i === currentPage ? 'page' : 'false');
            li.textContent = i;

            // 如果是当前页，添加激活类
            if (i === currentPage) {
                li.classList.add('semi-dy-open-page-item-active');
            }

            // 插入到下一页按钮之前
            if (nextBtn) {
                pageList.insertBefore(li, nextBtn);
            } else {
                pageList.appendChild(li);
            }
        }

        // 更新上一页/下一页按钮状态
        const prevBtn = pageList.querySelector('.semi-dy-open-page-prev');

        if (prevBtn) {
            if (currentPage === 1) {
                prevBtn.classList.add('semi-dy-open-page-item-disabled');
                prevBtn.setAttribute('aria-disabled', 'true');
            } else {
                prevBtn.classList.remove('semi-dy-open-page-item-disabled');
                prevBtn.setAttribute('aria-disabled', 'false');
            }
        }

        if (nextBtn) {
            if (currentPage === totalPages) {
                nextBtn.classList.add('semi-dy-open-page-item-disabled');
                nextBtn.setAttribute('aria-disabled', 'true');
            } else {
                nextBtn.classList.remove('semi-dy-open-page-item-disabled');
                nextBtn.setAttribute('aria-disabled', 'false');
            }
        }
    }

    /**
     * 绑定分页事件
     */
    function bindPaginationEvents() {
        const pageList = document.querySelector('.semi-dy-open-page');
        if (!pageList) return;

        // 点击页码
        pageList.addEventListener('click', function (e) {
            const pageItem = e.target.closest('.semi-dy-open-page-item:not(.semi-dy-open-page-prev):not(.semi-dy-open-page-next)');
            if (pageItem && !pageItem.classList.contains('semi-dy-open-page-item-disabled')) {
                const page = parseInt(pageItem.textContent);
                if (!isNaN(page)) {
                    renderTable(allHourlyData, page);
                }
            }
        });

        // 点击上一页
        const prevBtn = pageList.querySelector('.semi-dy-open-page-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (!this.classList.contains('semi-dy-open-page-item-disabled') && currentPage > 1) {
                    renderTable(allHourlyData, currentPage - 1);
                }
            });
        }

        // 点击下一页
        const nextBtn = pageList.querySelector('.semi-dy-open-page-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                const totalPages = Math.ceil(allHourlyData.length / pageSize);
                if (!this.classList.contains('semi-dy-open-page-item-disabled') && currentPage < totalPages) {
                    renderTable(allHourlyData, currentPage + 1);
                }
            });
        }

        console.log('✅ 分页事件已绑定');
    }

    /**
     * 导出数据为 CSV 文件
     */
    function exportToCSV() {
        if (!allHourlyData || allHourlyData.length === 0) {
            console.warn('没有可导出的数据');
            return;
        }

        // CSV 表头
        const headers = [
            '时间',
            '活跃用户数',
            '新增用户数',
            '累计用户数',
            '分享次数',
            '分享成功用户数',
            '分享新增用户数',
            '分享成功次数',
            '启动次数',
            '人均启动次数',
            '人均游戏时长',
            '次均游戏时长'
        ];

        // 构建 CSV 内容
        const csvRows = [];

        // 添加表头
        csvRows.push(headers.join(','));

        // 添加数据行
        allHourlyData.forEach(row => {
            const values = [
                row.time,
                row.activeUsers,
                row.newUsers,
                row.totalUsers,
                row.shares,
                row.shareSuccessUsers,
                row.shareNewUsers,
                row.shareSuccess,
                row.startup,
                row.avgStartup.toFixed(3),
                formatTime(row.avgDuration),
                formatTime(row.singleAvgDuration)
            ];
            csvRows.push(values.join(','));
        });

        // 生成 CSV 字符串
        const csvContent = csvRows.join('\n');

        // 创建 Blob 对象
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // 生成文件名（包含昨天的日期）
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`;
        // const fileName = `用户分析数据_${dateStr}.csv`;
        const fileName = `行为数据.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ 数据已导出: ${fileName}`);
    }

    /**
     * 绑定导出按钮事件
     */
    function bindExportButton() {
        // 通过类名获取导出按钮
        const exportBtn = document.querySelector('.export-table-btn');

        if (exportBtn) {
            exportBtn.addEventListener('click', function (e) {
                e.preventDefault();
                exportToCSV();
            });
            console.log('✅ 导出按钮事件已绑定');
        } else {
            console.warn('未找到导出按钮（.export-table-btn）');
        }
    }

    /**
     * 渲染实时分析卡片
     */
    function renderRealTimeCards() {
        const chartData = window.chartDataConfig;
        const realTimeData = chartData.realTime[0];

        // 查找访问人数和访问次数的卡片
        const cards = document.querySelectorAll('#semiTabPanelRealTime .omg-metric-card-number');

        if (cards.length >= 2) {
            // 第一个卡片：访问人数
            cards[0].textContent = formatNumber(realTimeData.visitors);
            // 第二个卡片：访问次数
            cards[1].textContent = formatNumber(realTimeData.visits);
            console.log('✓ 实时分析卡片已更新');
        } else {
            console.warn('未找到实时分析卡片元素');
        }
    }

    /**
     * 导出实时分析数据（0点到当前小时）
     */
    function exportRealTimeData() {
        const chartData = window.chartDataConfig;
        const realTimeData = chartData.realTime[0];

        // 获取当前小时
        const now = new Date();
        const currentHour = now.getHours();

        console.log(`导出实时数据：00:00 - ${String(currentHour).padStart(2, '0')}:00`);

        // 构建 CSV 内容
        const csvRows = [];

        // 添加表头
        csvRows.push('日期,访问人数,访问次数');

        // 生成 0 点到当前小时的数据
        for (let hour = 0; hour <= currentHour; hour++) {
            const hourKey = String(hour).padStart(2, '0');
            const timeStr = `${hourKey}:00:00`;
            const weight = HOURLY_WEIGHTS[hourKey];

            // 按权重计算当前小时的数据
            const visitors = Math.max(1, Math.round(realTimeData.visitors * weight));
            const visits = Math.max(1, Math.round(realTimeData.visits * weight));

            csvRows.push(`${timeStr},${visitors},${visits}`);
        }

        // 生成 CSV 字符串
        const csvContent = csvRows.join('\n');

        // 创建 Blob 对象
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // 生成文件名（实时数据_日期.csv）
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
        // const fileName = `实时数据_${dateStr}.csv`;
        const fileName = `行为数据.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ 实时数据已导出: ${fileName}`);
    }

    /**
     * 绑定实时分析导出按钮事件
     */
    function bindRealTimeExportButton() {
        const exportBtn = document.querySelector('.export-realtime-btn');

        if (exportBtn) {
            exportBtn.addEventListener('click', function (e) {
                e.preventDefault();
                exportRealTimeData();
            });
            console.log('✅ 实时分析导出按钮事件已绑定');
        } else {
            console.warn('未找到实时分析导出按钮（.export-realtime-btn）');
        }
    }

    /**
     * 主初始化函数
     */
    async function initUserAnalysisTable() {
        console.log('初始化用户分析表格...');

        // 首先加载权重配置
        await loadHourlyWeights();

        // 从全局获取图表数据（由 init-chart.js 加载）
        const chartData = window.chartDataConfig;
        const dailyData = chartData.overview[0].data;

        // 转换为小时数据
        const hourlyData = convertDailyToHourly(dailyData);

        // 渲染表格（第1页）
        if (hourlyData.length > 0) {
            renderTable(hourlyData, 1);
            // 绑定分页事件
            bindPaginationEvents();
            // 绑定导出按钮
            bindExportButton();
        }

        // 渲染实时分析卡片
        renderRealTimeCards();
        // 绑定实时分析导出按钮
        bindRealTimeExportButton();
    }
})();
