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

            // ---------- Media Session API 集成 ----------
            if ('mediaSession' in navigator) {
                // 更新锁屏媒体信息的函数
                function updateMediaSession(song) {
                    if (!song) return;
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: song.name || '未知歌曲',
                        artist: song.artist || '未知歌手',
                        album: '我的博客音乐',
                        artwork: song.cover ? [
                            { src: song.cover, sizes: '96x96', type: 'image/jpeg' },
                            { src: song.cover, sizes: '128x128', type: 'image/jpeg' },
                            { src: song.cover, sizes: '192x192', type: 'image/jpeg' },
                            { src: song.cover, sizes: '256x256', type: 'image/jpeg' },
                            { src: song.cover, sizes: '384x384', type: 'image/jpeg' },
                            { src: song.cover, sizes: '512x512', type: 'image/jpeg' }
                        ] : []
                    });
                }

                // 初始化时设置当前歌曲信息
                var currentSong = window.ap.list.audios[window.ap.list.index];
                updateMediaSession(currentSong);

                // 切歌时更新
                window.ap.on('listswitch', function () {
                    var song = window.ap.list.audios[window.ap.list.index];
                    updateMediaSession(song);
                });

                // 绑定系统媒体控制（锁屏、耳机线控）
                navigator.mediaSession.setActionHandler('play', function () {
                    window.ap.play();
                });
                navigator.mediaSession.setActionHandler('pause', function () {
                    window.ap.pause();
                });
                navigator.mediaSession.setActionHandler('previoustrack', function () {
                    window.ap.skipBack();
                });
                navigator.mediaSession.setActionHandler('nexttrack', function () {
                    window.ap.skipForward();
                });
            }
            // ---------- Media Session API 结束 ----------
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