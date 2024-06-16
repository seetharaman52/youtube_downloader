import io
from pytube import YouTube
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from urllib.parse import quote
from hurry.filesize import size
from sse_starlette.sse import EventSourceResponse
import time
import asyncio

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

progress = 0
def on_progress(stream, chunk, bytes_remaining):
    global progress
    total_size = stream.filesize
    progress = (total_size - bytes_remaining) / total_size
    print(f'Progress: {progress * 100:.2f}%')

@app.post('/process')
async def process_url(data : dict):
    url = data.get('url')
    if not url:
        raise HTTPException(status_code=400, detail="URL not provided")
    try:
        yt = YouTube(url, on_progress_callback=on_progress)
        streams = yt.streams.filter(adaptive=True, only_video=True)
        desired_resolutions = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p']
        filtered_streams = [stream for stream in streams if stream.resolution in desired_resolutions]
        resolutions = sorted(set(stream.resolution for stream in filtered_streams), key=lambda x: int(x.replace('p', '')))
        file_size = {stream.resolution: size(stream.filesize) for stream in filtered_streams}
        response = {
            "title": yt.title,
            "thumbnail_url": yt.thumbnail_url,
            "resolutions": resolutions,
            "file_size": file_size,
        }
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/download')
async def download_video(data: dict):
    url = data.get('url')
    quality = data.get('resolution')
    print(url, quality)
    if not url:
        raise HTTPException(status_code=400, detail="URL not provided")
    if not quality:
        raise HTTPException(status_code=400, detail="Resolution not provided")
    try:
        yt = YouTube(url, on_progress_callback=on_progress)
        stream = yt.streams.filter(adaptive=True, only_video=True, res=quality).first()
        if not stream:
            raise HTTPException(status_code=404, detail=f"No {quality} stream available")
        video_buffer = io.BytesIO()
        stream.stream_to_buffer(video_buffer)
        video_buffer.seek(0)
        safe_title = quote(yt.title)
        headers = {
            'Content-Disposition': f'attachment; filename="{safe_title}.mp4"',
            "Content-type" : 'video/mp4; charset=utf-8'
        }
        return StreamingResponse(video_buffer, headers=headers)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        print(f"Exception occurred: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch video: {str(exc)}")

@app.get('/progress')
async def progress(request: Request):
    async def event_generator():
        while True:
            for i in range(101):
                yield {
                    "event": "progress",
                    "data": f"{i}"
                }
                await asyncio.sleep(0.5)
    print('Inside progress')
    return EventSourceResponse(event_generator())

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)