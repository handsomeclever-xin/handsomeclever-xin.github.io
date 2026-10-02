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
        .then(function (response) { return response.json(); })
        .then(function (audioList) {
            // 1. 先创建播放器，确保基础功能正常
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

            // 2. 播放器创建成功后，再尝试初始化 Media Session
            //    所有代码都包在 try-catch 里，即使出错也不会影响播放器
            try {
                initMediaSession();
            } catch (e) {
                console.warn('Media Session 初始化失败（不影响播放）:', e);
            }
        })
        .catch(function (error) {
            console.error('加载音乐列表失败:', error);
        });
}

// Media Session 独立函数
function initMediaSession() {
    if (!('mediaSession' in navigator)) {
        console.log('当前浏览器不支持 Media Session');
        return;
    }
    if (!window.ap || !window.ap.list || !window.ap.list.audios) {
        console.warn('播放器实例未就绪，跳过 Media Session');
        return;
    }

    // --- 内部工具函数 ---
    function updateMetadata(song) {
        if (!song) return;
        try {
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
        } catch (e) {}
    }

    function setPlaybackState(state) {
        try { navigator.mediaSession.playbackState = state; } catch (e) {}
    }

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
        } catch (e) {}
    }

    // --- 初始化设置 ---
    var currentSong = window.ap.list.audios[window.ap.list.index];
    updateMetadata(currentSong);

    // --- 监听播放器事件 ---
    window.ap.on('listswitch', function () {
        var song = window.ap.list.audios[window.ap.list.index];
        updateMetadata(song);
        updatePositionState();
    });

    window.ap.on('play', function () {
        setPlaybackState('playing');
        updateMetadata(window.ap.list.audios[window.ap.list.index]);
    });

    window.ap.on('pause', function () {
        setPlaybackState('paused');
    });

    window.ap.on('ended', function () {
        setPlaybackState('none');
    });

    // 进度同步（每秒最多一次）
    var lastPosUpdate = 0;
    window.ap.on('timeupdate', function () {
        var now = Date.now();
        if (now - lastPosUpdate > 1000) {
            lastPosUpdate = now;
            updatePositionState();
        }
    });

    // --- 注册系统媒体控制（独立 try-catch） ---
    try {
        navigator.mediaSession.setActionHandler('play', function () {
            if (window.ap && window.ap.audio) {
                window.ap.audio.play();
                setPlaybackState('playing');
            }
        });
    } catch (e) {}

    try {
        navigator.mediaSession.setActionHandler('pause', function () {
            if (window.ap && window.ap.audio) {
                window.ap.audio.pause();
                setPlaybackState('paused');
            }
        });
    } catch (e) {}

    try {
        navigator.mediaSession.setActionHandler('previoustrack', function () {
            if (window.ap) window.ap.skipBack();
        });
    } catch (e) {}

    try {
        navigator.mediaSession.setActionHandler('nexttrack', function () {
            if (window.ap) window.ap.skipForward();
        });
    } catch (e) {}

    try {
        navigator.mediaSession.setActionHandler('seekto', function (details) {
            if (details.seekTime !== undefined && window.ap && window.ap.audio) {
                window.ap.audio.currentTime = details.seekTime;
                updatePositionState();
            }
        });
    } catch (e) {}

    console.log('Media Session 初始化完成');
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