// 仅一个对外方法：getConfigPath('chart-data.json') -> ./conf/{appid}/chart-data.json
// appid 来源：① localStorage 键 dy_conf_current_appid（切换账号时写入）② 否则用下面 fetch 到的 isCurrent
(function () {
    var KEY = 'dy_conf_current_appid';
    var cachedAppid = null;

    fetch('./account.json')
        .then(function (r) { return r.json(); })
        .then(function (accounts) {
            if (!Array.isArray(accounts) || !accounts.length) return;
            var cur = accounts.find(function (a) { return a.isCurrent === true; }) || accounts[0];
            if (cur && cur.appid) cachedAppid = cur.appid;
        })
        .catch(function () { });

    function getConfigPath(fileName) {
        var appid;
        try {
            appid = localStorage.getItem(KEY);
        } catch (e) { }
        if (!appid) appid = cachedAppid;
        if (!appid) return null;
        var name = String(fileName || '').split('/').pop();
        return './conf/' + appid + '/' + name;
    }

    window.getConfigPath = getConfigPath;
})();
