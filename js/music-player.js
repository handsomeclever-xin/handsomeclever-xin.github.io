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

                // 1. 更新锁屏媒体信息
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

                // 2. 同步播放状态（关键！）
                function updatePlaybackState(state) {
                    try {
                        navigator.mediaSession.playbackState = state;
                    } catch (e) {
                        console.warn('设置 playbackState 失败:', e);
                    }
                }

                // 3. 同步播放进度（后台也能看到进度条）
                function updatePositionState() {
                    if (!window.ap || !window.ap.audio) return;
                    var audio = window.ap.audio;
                    if (isNaN(audio.duration) || audio.duration === 0) return;
                    try {
                        navigator.mediaSession.setPositionState({
                            duration: audio.duration,
                            playbackRate: audio.playbackRate || 1,
                            position: audio.currentTime || 0
                        });
                    } catch (e) {
                        // 某些浏览器不支持 setPositionState，忽略
                    }
                }

                // 初始化：设置当前歌曲信息
                var currentSong = window.ap.list.audios[window.ap.list.index];
                updateMediaSession(currentSong);

                // 切歌时更新歌曲信息和进度
                window.ap.on('listswitch', function () {
                    var song = window.ap.list.audios[window.ap.list.index];
                    updateMediaSession(song);
                    updatePositionState();
                });

                // 播放、暂停时同步状态
                window.ap.on('play', function () {
                    updatePlaybackState('playing');
                    updateMediaSession(window.ap.list.audios[window.ap.list.index]);
                    updatePositionState();
                });
                window.ap.on('pause', function () {
                    updatePlaybackState('paused');
                });
                window.ap.on('ended', function () {
                    updatePlaybackState('none');
                });

                // 进度变化时同步（每秒一次，开销很小）
                window.ap.on('timeupdate', function () {
                    updatePositionState();
                });

                // 绑定系统媒体控制（锁屏、耳机线控、通知栏）
                try {
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
                    navigator.mediaSession.setActionHandler('seekto', function (details) {
                        if (details.seekTime !== undefined) {
                            window.ap.seek(details.seekTime);
                        }
                    });
                } catch (e) {
                    console.warn('绑定媒体控制失败:', e);
                }
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
    if (!window.ap) {
        initAPlayer();
    } else if (!document.getElementById('aplayer-global')) {
        var container = document.createElement('div');
        container.id = 'aplayer-global';
        container.className = 'aplayer no-destroy';
        document.body.appendChild(container);
    }
});