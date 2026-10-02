function initAPlayer() {
    // 核心防重启逻辑：只要 window.ap 存在，绝对不重新创建
    if (window.ap) return;

    var container = document.getElementById('aplayer-global');
    if (!container) {
        container = document.createElement('div');
        container.id = 'aplayer-global';
        container.className = 'aplayer no-destroy';
        document.body.appendChild(container);
    }

    fetch('/music/music-data.json')
        .then(response => response.json())
        .then(audioList => {
            window.ap = new APlayer({
                container: container,
                fixed: true,
                mini: true,
                autoplay: false,
                theme: '#FADFA3',
                loop: 'all',
                order: 'random',
                preload: 'metadata',
                volume: 0.7,
                audio: audioList
            });
            console.log("播放器加载成功，共" + audioList.length + "首歌");
        })
        .catch(error => {
            console.error('加载音乐列表失败:', error);
        });
}

// 首次加载
document.addEventListener('DOMContentLoaded', function () {
    initAPlayer();
});

// Pjax 切换页面时
document.addEventListener('pjax:complete', function () {
    // 只要 window.ap 还在，音乐就不会断，什么都不做！
    // 只有当容器真的被误删时，才补一个容器回去，但不重新创建实例。
    if (!window.ap) {
        initAPlayer();
    } else if (!document.getElementById('aplayer-global')) {
        // 极端情况：Pjax 把容器弄丢了，我们用 JS 把它塞回 body 末尾
        var container = document.createElement('div');
        container.id = 'aplayer-global';
        container.className = 'aplayer no-destroy';
        document.body.appendChild(container);
        // 此时 window.ap 还在播放，我们不再初始化，让容器跟实体重新关联即可
    }
});