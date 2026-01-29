@echo off
:: 这里替换为你实际的FFmpeg完整路径（必须是绝对路径）
"D:\ffmpeg\bin\ffmpeg.exe" ^
-rtsp_transport tcp ^
-max_delay 5000000 ^
-i "rtsp://admin:15582406937Yj@192.168.1.64:554/Streaming/Channels/101?transportmode=unicast&profile=Profile_1" ^
-c:v libx264 ^
-c:a aac ^
-preset ultrafast ^
-f hls ^
-hls_time 5 ^
-hls_list_size 12 ^
-hls_flags delete_segments+omit_endlist ^
-hls_allow_cache 0 ^
-y ^
"E:\A_pro\system\shrimpSystem\vue3-admin-server\uploads\streams\1769679394653\index.m3u8"
