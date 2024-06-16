from pytube import YouTube

yt = YouTube("https://www.youtube.com/watch?v=7tfUaYAzqL4")

print(yt.title, "\n")

data = yt.streams.filter(adaptive=True)

# print(yt.streams.get_highest_resolution())

for i in data:
    print(i, "\n")