// 日期选择器图标交互控制
(function () {
    // 将初始化函数暴露到全局作用域，供页面切换时重新调用
    window.initDatepickerIconInteraction = initDatepickerIconInteraction;

    // 初始化日期选择器图标交互
    function initDatepickerIconInteraction() {
        // 获取所有日期选择器
        const datepickers = document.querySelectorAll('.semi-dy-open-datepicker');
        if (datepickers.length === 0) return;

        console.log(`找到 ${datepickers.length} 个日期选择器`);

        // X 图标的 SVG 路径
        const clearIconSVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm5.04-6.14a1.5 1.5 0 0 1-2.13.04l-2.87-2.78L9.26 17A1.5 1.5 0 0 1 7.1 14.9l2.78-2.87L7 9.26A1.5 1.5 0 1 1 9.1 7.1l2.87 2.78L14.74 7A1.5 1.5 0 0 1 16.9 9.1l-2.78 2.87L17 14.74c.6.58.61 1.53.04 2.12Z" fill="currentColor"></path>
    </svg>`;

        const calendarIconPath = `M4 20V8h16v12H4ZM2 4c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm4 6.5c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2Zm.5 4.5a.5.5 0 0 0-.5.5v2c0 .28.22.5.5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-2Zm4-4.5c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2ZM11 15a.5.5 0 0 0-.5.5v2c0 .28.22.5.5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-2Zm4-4.5c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2Zm.5 4.5a.5.5 0 0 0-.5.5v2c0 .28.22.5.5.5h2a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-2Z`;

        // 为每个日期选择器添加 hover 事件
        datepickers.forEach((datepicker, index) => {
            const iconContainer = datepicker.querySelector('.datePicker-tigger-content-LsTspS');
            if (!iconContainer) return;

            const calendarIcon = iconContainer.querySelector('.semi-dy-open-icon-calendar');
            if (!calendarIcon) return;

            console.log(`初始化第 ${index + 1} 个日期选择器的图标交互`);

            // Hover 时显示 X 图标
            datepicker.addEventListener('mouseenter', function () {
                calendarIcon.innerHTML = clearIconSVG;
                calendarIcon.classList.remove('semi-dy-open-icon-calendar');
                calendarIcon.classList.add('semi-dy-open-icon-clear');
            });

            // 移出时恢复日历图标
            datepicker.addEventListener('mouseleave', function () {
                calendarIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false" aria-hidden="true">
        <path fill-rule="evenodd" clip-rule="evenodd" d="${calendarIconPath}" fill="currentColor"></path>
      </svg>`;
                calendarIcon.classList.remove('semi-dy-open-icon-clear');
                calendarIcon.classList.add('semi-dy-open-icon-calendar');
            });
        });

        console.log('✅ 日期选择器图标交互初始化完成');
    }
})();
