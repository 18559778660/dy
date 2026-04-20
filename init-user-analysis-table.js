// 用户分析表格动态渲染功能
(function () {
    console.log('开始初始化用户分析表格...');

    // 将初始化函数暴露到全局作用域
    window.initUserAnalysisTable = initUserAnalysisTable;

    /** 与 chart-data.json 中 douyinSourceScenes 里「首页侧边栏」场景的官方 sceneId 一致 */
    const DOUYIN_SIDEBAR_SCENE_ID = '021036';

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
        // 获取昨天的日期（格式：YYYY-MM-DD）
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;

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

            // 根据权重分配各项指标（允许某些小时为0）
            hourlyData.push({
                time: timeStr,
                activeUsers: Math.round(yesterdayData.dailyUsers * weight),
                newUsers: Math.round(yesterdayData.newUsers * weight),
                totalUsers: Math.round(yesterdayData.totalUser * weight),
                shares: Math.round(yesterdayData.totalShares * weight),
                shareSuccessUsers: Math.round(yesterdayData.shareSuccessUsers * weight),
                shareNewUsers: Math.round(yesterdayData.shareNewUsers * weight),
                shareSuccess: Math.round(yesterdayData.shareSuccess * weight),
                startup: Math.round(yesterdayData.startup * weight),
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
     * @param {Array} hourlyData - 小时数据数组
     * @param {number} page - 页码，默认 1
     * @param {string} tbodySelector - tbody 选择器，默认为第一个 .semi-dy-open-table-tbody
     */
    function renderTable(hourlyData, page = 1, tbodySelector = '.semi-dy-open-table-tbody') {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) {
            console.warn(`未找到表格 tbody 元素: ${tbodySelector}`);
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
     * @param {string} tbodySelector - tbody 选择器，用于重新渲染时传递
     */
    function bindPaginationEvents(tbodySelector = '.semi-dy-open-table-tbody') {
        const pageList = document.querySelector('.semi-dy-open-page');
        if (!pageList) return;

        // 点击页码
        pageList.addEventListener('click', function (e) {
            const pageItem = e.target.closest('.semi-dy-open-page-item:not(.semi-dy-open-page-prev):not(.semi-dy-open-page-next)');
            if (pageItem && !pageItem.classList.contains('semi-dy-open-page-item-disabled')) {
                const page = parseInt(pageItem.textContent);
                if (!isNaN(page)) {
                    renderTable(allHourlyData, page, tbodySelector);
                }
            }
        });

        // 点击上一页
        const prevBtn = pageList.querySelector('.semi-dy-open-page-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                if (!this.classList.contains('semi-dy-open-page-item-disabled') && currentPage > 1) {
                    renderTable(allHourlyData, currentPage - 1, tbodySelector);
                }
            });
        }

        // 点击下一页
        const nextBtn = pageList.querySelector('.semi-dy-open-page-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                const totalPages = Math.ceil(allHourlyData.length / pageSize);
                if (!this.classList.contains('semi-dy-open-page-item-disabled') && currentPage < totalPages) {
                    renderTable(allHourlyData, currentPage + 1, tbodySelector);
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
     * 初始化实时分析卡片点击事件
     */
    function initRealTimeCards() {
        const cards = document.querySelectorAll('#semiTabPanelRealTime .omg-metric-card.omg-metric-card-checkable');
        console.log('找到实时分析卡片数量:', cards.length);

        cards.forEach(card => {
            // 查找卡片标题
            const titleElement = card.querySelector('.omg-metric-card-solid-title-tooltip');
            if (!titleElement) return;

            const metricTitle = titleElement.textContent.trim();

            // 给整个卡片添加点击事件
            card.addEventListener('click', function (e) {
                e.stopPropagation();

                // 移除其他卡片的选中状态
                document.querySelectorAll('#semiTabPanelRealTime .omg-metric-card-bordered-checked').forEach(c => {
                    c.classList.remove('omg-metric-card-bordered-checked');
                });

                // 添加当前卡片的选中状态
                this.classList.add('omg-metric-card-bordered-checked');

                console.log('选中实时分析卡片:', metricTitle);

                // 切换图表数据
                if (typeof window.updateRealTimeChartMetric === 'function') {
                    window.updateRealTimeChartMetric(metricTitle);
                }
            });
        });
    }

    /**
     * 渲染实时分析卡片（累计到当前小时）
     */
    function renderRealTimeCards() {
        const chartData = window.chartDataConfig;
        const hourlyData = chartData.realTime.hourlyData;

        // 获取当前小时
        const currentHour = new Date().getHours();

        // 累计 0 点到当前小时的数据
        let totalVisitors = 0;
        let totalVisits = 0;

        for (let i = 0; i <= currentHour && i < hourlyData.length; i++) {
            totalVisitors += hourlyData[i].visitors;
            totalVisits += hourlyData[i].visits;
        }

        // 查找访问人数和访问次数的卡片
        const cards = document.querySelectorAll('#semiTabPanelRealTime .omg-metric-card-number');

        if (cards.length >= 2) {
            // 第一个卡片：访问人数（累计）
            cards[0].textContent = formatNumber(totalVisitors);
            // 第二个卡片：访问次数（累计）
            cards[1].textContent = formatNumber(totalVisits);
            console.log('✓ 实时分析卡片已更新（累计到', String(currentHour).padStart(2, '0') + ':00）');
        } else {
            console.warn('未找到实时分析卡片元素');
        }
    }

    /**
     * 导出实时分析数据（0点到当前小时）
     */
    function exportRealTimeData() {
        const chartData = window.chartDataConfig;
        const hourlyData = chartData.realTime.hourlyData;

        // 获取当前小时
        const now = new Date();
        const currentHour = now.getHours();

        console.log(`导出实时数据：00:00 - ${String(currentHour).padStart(2, '0')}:00`);

        // 构建 CSV 内容
        const csvRows = [];

        // 添加表头
        csvRows.push('日期,访问人数,访问次数');

        // 生成 0 点到当前小时的数据（从 JSON 中读取）
        for (let i = 0; i <= currentHour && i < hourlyData.length; i++) {
            const row = hourlyData[i];
            csvRows.push(`${row.hour},${row.visitors},${row.visits}`);
        }

        // 生成 CSV 字符串
        const csvContent = csvRows.join('\n');

        // 创建 Blob 对象
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        // 生成文件名
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');
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
     * @param {string} tbodySelector - tbody 选择器，默认为第一个表格
     */
    async function initUserAnalysisTable(tbodySelector = '.semi-dy-open-table-tbody') {
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
            renderTable(hourlyData, 1, tbodySelector);
            // 绑定分页事件
            bindPaginationEvents(tbodySelector);
            // 绑定导出按钮
            bindExportButton();
        }

        // 渲染实时分析卡片
        renderRealTimeCards();
        // 初始化实时分析卡片点击事件
        initRealTimeCards();
        // 绑定实时分析导出按钮
        bindRealTimeExportButton();
    }

    /**
     * 渲染留存分析表格
     */
    function renderRetentionTable() {
        console.log('渲染留存分析表格...');

        if (!window.chartDataConfig || !window.chartDataConfig.overview) {
            console.warn('未找到图表数据配置');
            return;
        }

        const tbody = document.querySelector('#retention-tbody');
        if (!tbody) {
            console.warn('未找到留存分析表格 tbody');
            return;
        }

        const chartConfig = window.chartDataConfig.overview[0];
        const data = chartConfig.data;

        // 清空现有内容
        tbody.innerHTML = '';

        // 生成表格行（最近7天）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const filteredData = data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= sevenDaysAgo && itemDate < today;
        });

        // 按日期正序排列（从旧到新）
        filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // ✅ 保存数据到全局变量，供导出使用
        window.retentionTableData = filteredData;

        filteredData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'row');
            row.setAttribute('aria-rowindex', index + 1);
            row.className = 'semi-dy-open-table-row';
            row.setAttribute('data-row-key', `retention-${item.date}-全部`);

            // 第1列：日期
            const dateCell = createCell(item.date, 1, 'left');
            row.appendChild(dateCell);

            // 第2列：平台（默认显示“全部”）
            const platformCell = createCell('全部', 2, 'left', true);
            row.appendChild(platformCell);

            // 第3列：活跃用户数
            const activeUsersCell = createCell(item.sidebarVisitdailyUsers ? item.sidebarVisitdailyUsers.toLocaleString('zh-CN') : '-', 3);
            row.appendChild(activeUsersCell);

            // 第4-12列：留存率（1天、2天、3天、4天、5天、6天、7天、14天、30天）
            const retentionFields = [
                'sidebarVisitday1Retention',
                'sidebarVisitday2Retention',
                'sidebarVisitday3Retention',
                'sidebarVisitday4Retention',
                'sidebarVisitday5Retention',
                'sidebarVisitday6Retention',
                'sidebarVisitday7Retention',
                'sidebarVisitday14Retention',
                'sidebarVisitday30Retention'
            ];

            retentionFields.forEach((field, i) => {
                const value = item[field];
                const displayValue = value ? value.toFixed(2) + '%' : '-';
                const colIndex = i + 4;

                // 第12列（30天后）需要固定右列样式
                let cell;
                if (colIndex === 12) {
                    cell = createCell(displayValue, colIndex, 'right', false, true);
                } else {
                    cell = createCell(displayValue, colIndex);
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        console.log(`✅ 留存分析表格渲染完成，共${filteredData.length}行`);
    }

    /**
     * 创建表格单元格
     */
    function createCell(content, colIndex, position = null, isLastLeft = false, isFirstRight = false) {
        const td = document.createElement('td');
        td.setAttribute('role', 'gridcell');
        td.setAttribute('aria-colindex', colIndex);
        td.className = 'semi-dy-open-table-row-cell';
        td.title = content;
        td.textContent = content;

        if (position === 'left') {
            td.classList.add('semi-dy-open-table-cell-fixed-left');
            if (isLastLeft) {
                td.classList.add('semi-dy-open-table-cell-fixed-left-last');
                td.style.left = '150px';
            } else {
                td.style.left = '0px';
            }
        } else if (position === 'right') {
            td.classList.add('semi-dy-open-table-cell-fixed-right');
            if (isFirstRight) {
                td.classList.add('semi-dy-open-table-cell-fixed-right-first');
                td.style.right = '0px';
            }
        }

        return td;
    }

    /**
     * 导出留存分析表格为CSV
     */
    function exportRetentionTable() {
        console.log('导出留存分析表格...');

        // ✅ 直接使用已渲染的数据，不重新查询
        const filteredData = window.retentionTableData;

        if (!filteredData || filteredData.length === 0) {
            console.warn('没有可导出的留存数据');
            return;
        }

        // 构建CSV内容
        const headers = ['日期', '影响因素', '活跃用户数', '1天后', '2天后', '3天后', '4天后', '5天后', '6天后', '7天后', '14天后', '30天后'];
        const csvRows = [];

        // 添加表头
        csvRows.push(headers.join(','));

        // 添加数据行
        filteredData.forEach(item => {
            const row = [
                item.date,
                '全部',
                item.sidebarVisitdailyUsers || 0,
                item.sidebarVisitday1Retention ? item.sidebarVisitday1Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday2Retention ? item.sidebarVisitday2Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday3Retention ? item.sidebarVisitday3Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday4Retention ? item.sidebarVisitday4Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday5Retention ? item.sidebarVisitday5Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday6Retention ? item.sidebarVisitday6Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday7Retention ? item.sidebarVisitday7Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday14Retention ? item.sidebarVisitday14Retention.toFixed(2) + '%' : '-',
                item.sidebarVisitday30Retention ? item.sidebarVisitday30Retention.toFixed(2) + '%' : '-'
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // 创建Blob并下载
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const fileName = '留存分析数据.csv';

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('✅ 留存分析表格导出完成');
    }

    // 暴露到全局
    window.initRetentionTable = renderRetentionTable;
    window.exportRetentionTable = exportRetentionTable;

    /**
     * 渲染侧边栏留存分析表格
     */
    function renderSidebarRetentionTable() {
        console.log('渲染侧边栏留存分析表格...');

        if (!window.chartDataConfig || !window.chartDataConfig.overview) {
            console.warn('未找到图表数据配置');
            return;
        }

        const tbody = document.querySelector('#sidebar-retention-tbody');
        if (!tbody) {
            console.warn('未找到侧边栏留存分析表格 tbody');
            return;
        }

        const chartConfig = window.chartDataConfig.overview[0];
        const data = chartConfig.data;

        // 清空现有内容
        tbody.innerHTML = '';

        // 生成表格行（最近7天）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const filteredData = data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= sevenDaysAgo && itemDate < today;
        });

        // 按日期正序排列（从旧到新）
        filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // ✅ 保存数据到全局变量，供导出使用
        window.sidebarRetentionTableData = filteredData;

        filteredData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.setAttribute('role', 'row');
            row.setAttribute('aria-rowindex', index + 1);
            row.className = 'semi-dy-open-table-row';
            row.setAttribute('data-row-key', `sideBarRetention-${item.date}-全部`);

            // 第1列：日期（固定左列，只有一列所以不是最后一列）
            const dateCell = createCell(item.date, 1, 'left', false);
            row.appendChild(dateCell);

            // 第2列：活跃用户数（按 sceneId 精确匹配，sceneName 不唯一）
            const sidebarDaily = item.douyinSourceScenes.find(s => s.sceneId === DOUYIN_SIDEBAR_SCENE_ID).dailyUsers;
            const activeUsersCell = createCell(sidebarDaily.toLocaleString('zh-CN'), 2);
            row.appendChild(activeUsersCell);

            // 第3列：渗透率
            const penetrationCell = createCell(item.penetrationRate ? item.penetrationRate.toFixed(2) + '%' : '-', 3);
            row.appendChild(penetrationCell);

            // 第4-11列：侧边栏留存率（1天、2天、3天、4天、5天、6天、7天、14天）
            const sidebarRetentionFields = [
                'sidebarDay1Retention',
                'sidebarDay2Retention',
                'sidebarDay3Retention',
                'sidebarDay4Retention',
                'sidebarDay5Retention',
                'sidebarDay6Retention',
                'sidebarDay7Retention',
                'sidebarDay14Retention'
            ];

            sidebarRetentionFields.forEach((field, i) => {
                const value = item[field];
                const displayValue = value ? value.toFixed(2) + '%' : '-';
                const colIndex = i + 4; // 从第4列开始
                const cell = createCell(displayValue, colIndex);
                row.appendChild(cell);
            });

            // 第12列：30天后留存率（固定右列）
            const day30Value = item.sidebarDay30Retention;
            const day30Display = day30Value ? day30Value.toFixed(2) + '%' : '-';
            const day30Cell = createCell(day30Display, 12, 'right', false, true);
            row.appendChild(day30Cell);

            tbody.appendChild(row);
        });

        console.log(`✅ 侧边栏留存分析表格渲染完成，共${filteredData.length}行`);
    }

    // 暴露到全局
    window.initSidebarRetentionTable = renderSidebarRetentionTable;

    /**
     * 通用表格导出函数
     * @param {string} dataKey - 全局数据变量名（如 'retentionTableData'）
     * @param {Array} headers - CSV表头数组
     * @param {Function} rowMapper - 数据行映射函数，接收 item 返回数组
     * @param {string} fileName - 导出文件名
     */
    function exportTableToCSV(dataKey, headers, rowMapper, fileName) {
        console.log(`导出表格: ${fileName}...`);

        const filteredData = window[dataKey];

        if (!filteredData || filteredData.length === 0) {
            console.warn(`没有可导出的数据 (${dataKey})`);
            return;
        }

        const csvRows = [headers.join(',')];

        filteredData.forEach(item => {
            const row = rowMapper(item);
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`✅ ${fileName} 导出完成`);
    }

    /**
     * 导出留存分析表格为CSV
     */
    function exportRetentionTable() {
        const headers = ['日期', '影响因素', '活跃用户数', '1天后', '2天后', '3天后', '4天后', '5天后', '6天后', '7天后', '14天后', '30天后'];

        const rowMapper = (item) => [
            item.date,
            '全部',
            item.sidebarVisitdailyUsers || 0,
            item.sidebarVisitday1Retention ? item.sidebarVisitday1Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday2Retention ? item.sidebarVisitday2Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday3Retention ? item.sidebarVisitday3Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday4Retention ? item.sidebarVisitday4Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday5Retention ? item.sidebarVisitday5Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday6Retention ? item.sidebarVisitday6Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday7Retention ? item.sidebarVisitday7Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday14Retention ? item.sidebarVisitday14Retention.toFixed(2) + '%' : '-',
            item.sidebarVisitday30Retention ? item.sidebarVisitday30Retention.toFixed(2) + '%' : '-'
        ];

        exportTableToCSV('retentionTableData', headers, rowMapper, '留存分析数据.csv');
    }

    /**
     * 导出侧边栏留存分析表格为CSV
     */
    function exportSidebarRetentionTable() {
        const headers = ['日期', '活跃用户数', '渗透率', '1天后', '2天后', '3天后', '4天后', '5天后', '6天后', '7天后', '14天后', '30天后'];

        const rowMapper = (item) => [
            item.date,
            item.douyinSourceScenes.find(s => s.sceneId === DOUYIN_SIDEBAR_SCENE_ID).dailyUsers,
            item.penetrationRate ? item.penetrationRate.toFixed(2) + '%' : '-',
            item.sidebarDay1Retention ? item.sidebarDay1Retention.toFixed(2) + '%' : '-',
            item.sidebarDay2Retention ? item.sidebarDay2Retention.toFixed(2) + '%' : '-',
            item.sidebarDay3Retention ? item.sidebarDay3Retention.toFixed(2) + '%' : '-',
            item.sidebarDay4Retention ? item.sidebarDay4Retention.toFixed(2) + '%' : '-',
            item.sidebarDay5Retention ? item.sidebarDay5Retention.toFixed(2) + '%' : '-',
            item.sidebarDay6Retention ? item.sidebarDay6Retention.toFixed(2) + '%' : '-',
            item.sidebarDay7Retention ? item.sidebarDay7Retention.toFixed(2) + '%' : '-',
            item.sidebarDay14Retention ? item.sidebarDay14Retention.toFixed(2) + '%' : '-',
            item.sidebarDay30Retention ? item.sidebarDay30Retention.toFixed(2) + '%' : '-'
        ];

        exportTableToCSV('sidebarRetentionTableData', headers, rowMapper, '侧边栏留存数据.csv');
    }

    // 暴露到全局
    window.exportRetentionTable = exportRetentionTable;
    window.exportSidebarRetentionTable = exportSidebarRetentionTable;

    /**
     * 「来源分析 - 汇总数据」表格
     * 支持时间范围切换：'yesterday' / 7 / 30
     * 7/30 天会按 sceneId 聚合（用户数类指标累加，次均时长按 dailyUsers 加权平均）
     */
    const SOURCE_SCENE_PAGE_SIZE = 10;
    let sourceSceneAllData = [];
    let sourceScenePage = 1;
    let sourceSceneTimeRange = 'yesterday';

    // 三种视图的场景白名单（由昨天 → 7 天 → 30 天层层扩展）

    // "昨天" 视图：21 个场景
    const YESTERDAY_SCENE_WHITELIST = new Set([
        '021036', '023010', '021020', '023041', '021012', '021001', '024001',
        '023001', '021043', '022001', '021009', '0', '023009', '023023',
        '104001', '023042', '021002', '991020', '024002', '022411', '234001'
    ]);

    // "7 天" 视图：31 个场景 = 昨天 21 个 + 仅在 7/30 天出现的 10 个
    const WEEK_SCENE_WHITELIST = new Set([
        ...YESTERDAY_SCENE_WHITELIST,
        '023002', '029105', '024007', '251043', '990001',
        '021017', '024004', '021011', '252001', '021008'
    ]);

    // "30 天" 视图：38 个场景 = 7 天 31 个 + 仅在 30 天出现的 7 个
    const MONTH_SCENE_WHITELIST = new Set([
        ...WEEK_SCENE_WHITELIST,
        '029988', '021014', '024003', '021053', '21042', '025002', '025001'
    ]);

    /**
     * 根据时间范围获取对应场景白名单（供图表/表格共享使用）
     * @param {'yesterday' | number} timeRange
     * @returns {Set<string>}
     */
    function getSourceSceneWhitelist(timeRange) {
        if (timeRange === 'yesterday') return YESTERDAY_SCENE_WHITELIST;
        const days = Number(timeRange) || 7;
        return days >= 30 ? MONTH_SCENE_WHITELIST : WEEK_SCENE_WHITELIST;
    }

    // 暴露到全局，让 init-user-analysis-chart.js 能复用
    window.getSourceSceneWhitelist = getSourceSceneWhitelist;

    /** 汇总一组 scene 到单条记录（dailyUsers/newUsers/startup 累加，singleAvgDuration 加权均值） */
    function aggregateScenes(sceneList) {
        const bucket = new Map();
        sceneList.forEach(scene => {
            const key = scene.sceneId;
            if (!bucket.has(key)) {
                bucket.set(key, {
                    sceneId: scene.sceneId,
                    sceneName: scene.sceneName,
                    dailyUsers: 0,
                    newUsers: 0,
                    startup: 0,
                    _durationWeightedSum: 0, // singleAvgDuration * dailyUsers 累计
                    _durationCount: 0        // 无加权时的简单计数
                });
            }
            const agg = bucket.get(key);
            agg.dailyUsers += scene.dailyUsers || 0;
            agg.newUsers += scene.newUsers || 0;
            agg.startup += scene.startup || 0;
            agg._durationWeightedSum += (scene.singleAvgDuration || 0) * (scene.dailyUsers || 0);
            agg._durationCount += 1;
        });
        // 产出 singleAvgDuration
        return Array.from(bucket.values()).map(agg => {
            const duration = agg.dailyUsers > 0
                ? Math.round(agg._durationWeightedSum / agg.dailyUsers)
                : 0;
            return {
                sceneId: agg.sceneId,
                sceneName: agg.sceneName,
                dailyUsers: agg.dailyUsers,
                newUsers: agg.newUsers,
                startup: agg.startup,
                singleAvgDuration: duration
            };
        });
    }

    /** 按 timeRange 收集场景数据（未排序、未分页） */
    function collectScenesByTimeRange(timeRange) {
        const config = window.chartDataConfig && window.chartDataConfig.overview;
        if (!config) return [];

        const allDays = config[0].data;

        if (timeRange === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const y = yesterday.getFullYear();
            const m = String(yesterday.getMonth() + 1).padStart(2, '0');
            const d = String(yesterday.getDate()).padStart(2, '0');
            const yesterdayStr = `${y}-${m}-${d}`;
            const dayData = allDays.find(item => item.date === yesterdayStr);
            if (!dayData) return [];
            const whitelist = getSourceSceneWhitelist('yesterday');
            return dayData.douyinSourceScenes.filter(s => whitelist.has(s.sceneId));
        }

        // 近 N 天聚合（仅聚合白名单内的场景，减少无效数据）
        const days = Number(timeRange) || 7;
        const whitelist = getSourceSceneWhitelist(days);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const from = new Date();
        from.setDate(from.getDate() - days);
        from.setHours(0, 0, 0, 0);

        const bucketList = [];
        allDays.forEach(item => {
            const itemDate = new Date(item.date);
            if (itemDate >= from && itemDate < today) {
                (item.douyinSourceScenes || []).forEach(s => {
                    if (whitelist.has(s.sceneId)) bucketList.push(s);
                });
            }
        });
        return aggregateScenes(bucketList);
    }

    function renderSourceSceneTable(page = 1, timeRange = sourceSceneTimeRange) {
        console.log(`渲染来源分析汇总表... (timeRange=${timeRange})`);

        const tbody = document.querySelector('#source-scene-tbody');
        if (!tbody) {
            console.warn('未找到来源分析汇总表 tbody');
            return;
        }

        sourceSceneTimeRange = timeRange;

        const scenes = collectScenesByTimeRange(timeRange)
            .sort((a, b) => (b.dailyUsers || 0) - (a.dailyUsers || 0));

        sourceSceneAllData = scenes;
        sourceScenePage = page;
        window.sourceSceneTableData = scenes;

        const total = scenes.length;
        const start = (page - 1) * SOURCE_SCENE_PAGE_SIZE;
        const end = Math.min(start + SOURCE_SCENE_PAGE_SIZE, total);
        const pageData = scenes.slice(start, end);

        tbody.innerHTML = '';
        pageData.forEach((scene, idx) => {
            const rowIndex = start + idx + 1;
            const tr = document.createElement('tr');
            tr.setAttribute('role', 'row');
            tr.setAttribute('aria-rowindex', rowIndex);
            tr.className = 'semi-dy-open-table-row';
            tr.setAttribute('data-row-key', start + idx);

            tr.innerHTML = `
                <td role="gridcell" aria-colindex="1"
                    class="semi-dy-open-table-row-cell semi-dy-open-table-cell-fixed-left semi-dy-open-table-cell-fixed-left-last"
                    title="${rowIndex}" style="left: 0px;">${rowIndex}</td>
                <td role="gridcell" aria-colindex="2" class="semi-dy-open-table-row-cell"
                    title="${scene.sceneId}">${scene.sceneId}</td>
                <td role="gridcell" aria-colindex="3" class="semi-dy-open-table-row-cell"
                    title="${scene.sceneName}">${scene.sceneName}</td>
                <td role="gridcell" aria-colindex="4" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(scene.dailyUsers)}">${formatNumber(scene.dailyUsers)}</td>
                <td role="gridcell" aria-colindex="5" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(scene.newUsers)}">${formatNumber(scene.newUsers)}</td>
                <td role="gridcell" aria-colindex="6" class="semi-dy-open-table-row-cell"
                    title="${formatNumber(scene.startup)}">${formatNumber(scene.startup)}</td>
                <td role="gridcell" aria-colindex="7"
                    class="semi-dy-open-table-row-cell semi-dy-open-table-cell-fixed-right semi-dy-open-table-cell-fixed-right-first"
                    title="${formatTime(scene.singleAvgDuration)}" style="right: 0px;">${formatTime(scene.singleAvgDuration)}</td>
            `;
            tbody.appendChild(tr);
        });

        updateSourceScenePagination(total, page, start, end);
        console.log(`✅ 来源分析汇总表渲染完成，第${page}页，显示 ${start + 1}-${end} / 共 ${total} 条`);
    }

    function updateSourceScenePagination(total, page, start, end) {
        const info = document.querySelector('.source-scene-pagination-info');
        if (info) {
            info.textContent = total > 0
                ? `显示第 ${start + 1} 条-第 ${end} 条，共 ${total} 条`
                : '暂无数据';
        }

        const ul = document.querySelector('.source-scene-pagination');
        if (!ul) return;

        const totalPages = Math.max(1, Math.ceil(total / SOURCE_SCENE_PAGE_SIZE));
        const prevBtn = ul.querySelector('.semi-dy-open-page-prev');
        const nextBtn = ul.querySelector('.semi-dy-open-page-next');

        // 清掉旧的数字页按钮
        ul.querySelectorAll('.semi-dy-open-page-item:not(.semi-dy-open-page-prev):not(.semi-dy-open-page-next)')
            .forEach(el => el.remove());

        // 重新生成
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = 'semi-dy-open-page-item';
            li.setAttribute('aria-label', `Page ${i}`);
            li.setAttribute('aria-current', i === page ? 'page' : 'false');
            li.textContent = i;
            if (i === page) li.classList.add('semi-dy-open-page-item-active');
            if (nextBtn) ul.insertBefore(li, nextBtn);
            else ul.appendChild(li);
        }

        // 前后按钮禁用状态
        if (prevBtn) {
            prevBtn.classList.toggle('semi-dy-open-page-item-disabled', page === 1);
            prevBtn.setAttribute('aria-disabled', page === 1 ? 'true' : 'false');
        }
        if (nextBtn) {
            nextBtn.classList.toggle('semi-dy-open-page-item-disabled', page >= totalPages);
            nextBtn.setAttribute('aria-disabled', page >= totalPages ? 'true' : 'false');
        }
    }

    function bindSourceScenePaginationEvents() {
        const ul = document.querySelector('.source-scene-pagination');
        if (!ul) return;

        ul.addEventListener('click', function (e) {
            const pageItem = e.target.closest('.semi-dy-open-page-item');
            if (!pageItem || pageItem.classList.contains('semi-dy-open-page-item-disabled')) return;

            const totalPages = Math.ceil(sourceSceneAllData.length / SOURCE_SCENE_PAGE_SIZE);
            if (pageItem.classList.contains('semi-dy-open-page-prev')) {
                if (sourceScenePage > 1) renderSourceSceneTable(sourceScenePage - 1, sourceSceneTimeRange);
            } else if (pageItem.classList.contains('semi-dy-open-page-next')) {
                if (sourceScenePage < totalPages) renderSourceSceneTable(sourceScenePage + 1, sourceSceneTimeRange);
            } else {
                const p = parseInt(pageItem.textContent, 10);
                if (!isNaN(p)) renderSourceSceneTable(p, sourceSceneTimeRange);
            }
        });
    }

    function exportSourceSceneTable() {
        const headers = ['顺序', '场景值ID', '场景值名称', '活跃用户数', '新增用户数', '启动次数', '次均游戏时长'];
        const rowMapper = (scene, i) => [
            i + 1,
            scene.sceneId,
            scene.sceneName,
            scene.dailyUsers,
            scene.newUsers,
            scene.startup,
            formatTime(scene.singleAvgDuration)
        ];

        const data = window.sourceSceneTableData;
        if (!data || data.length === 0) {
            console.warn('没有可导出的来源场景数据');
            return;
        }
        const csvRows = [headers.join(',')];
        data.forEach((item, i) => csvRows.push(rowMapper(item, i).join(',')));
        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', '来源分析汇总数据.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ 来源分析汇总表导出完成');
    }

    function initSourceSceneTable() {
        renderSourceSceneTable(1, 'yesterday');
        bindSourceScenePaginationEvents();
    }

    /** 时间筛选切换时调用（'yesterday' | 7 | 30），自动回到第 1 页 */
    function updateSourceSceneTable(timeRange) {
        renderSourceSceneTable(1, timeRange);
    }

    // 暴露到全局
    window.initSourceSceneTable = initSourceSceneTable;
    window.updateSourceSceneTable = updateSourceSceneTable;
    window.exportSourceSceneTable = exportSourceSceneTable;
})();
