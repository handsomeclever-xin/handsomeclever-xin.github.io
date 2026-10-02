            // ---------- Media Session API 集成 ----------
            if ('mediaSession' in navigator) {

                // 更新锁屏媒体信息
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

                // 同步播放状态
                function updatePlaybackState(state) {
                    try { navigator.mediaSession.playbackState = state; } catch (e) {}
                }

                // 同步播放进度（每秒最多一次）
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

                // 初始化
                updateMediaSession(window.ap.list.audios[window.ap.list.index]);

                // 切歌时更新元数据
                window.ap.on('listswitch', function () {
                    updateMediaSession(window.ap.list.audios[window.ap.list.index]);
                    updatePositionState();
                });

                // 播放/暂停时同步状态
                window.ap.on('play', function () {
                    updatePlaybackState('playing');
                    updateMediaSession(window.ap.list.audios[window.ap.list.index]);
                });
                window.ap.on('pause', function () {
                    updatePlaybackState('paused');
                });
                window.ap.on('ended', function () {
                    updatePlaybackState('none');
                });

                // 进度更新（防抖，避免频繁调用）
                var lastPositionUpdate = 0;
                window.ap.on('timeupdate', function () {
                    var now = Date.now();
                    if (now - lastPositionUpdate > 1000) {
                        lastPositionUpdate = now;
                        updatePositionState();
                    }
                });

                // 独立注册每个 handler，防止一个失败影响其他
                try {
                    navigator.mediaSession.setActionHandler('play', function () {
                        if (window.ap && window.ap.audio) {
                            window.ap.audio.play();
                            updatePlaybackState('playing');
                        }
                    });
                } catch (e) { console.warn('play handler 注册失败:', e); }

                try {
                    navigator.mediaSession.setActionHandler('pause', function () {
                        if (window.ap && window.ap.audio) {
                            window.ap.audio.pause();
                            updatePlaybackState('paused');
                        }
                    });
                } catch (e) { console.warn('pause handler 注册失败:', e); }

                try {
                    navigator.mediaSession.setActionHandler('previoustrack', function () {
                        if (window.ap) window.ap.skipBack();
                    });
                } catch (e) { console.warn('previoustrack handler 注册失败:', e); }

                try {
                    navigator.mediaSession.setActionHandler('nexttrack', function () {
                        if (window.ap) window.ap.skipForward();
                    });
                } catch (e) { console.warn('nexttrack handler 注册失败:', e); }

                try {
                    navigator.mediaSession.setActionHandler('seekto', function (details) {
                        if (details.seekTime !== undefined && window.ap && window.ap.audio) {
                            window.ap.audio.currentTime = details.seekTime;
                            updatePositionState();
                        }
                    });
                } catch (e) { console.warn('seekto handler 注册失败:', e); }

            }
            // ---------- Media Session API 结束 ----------