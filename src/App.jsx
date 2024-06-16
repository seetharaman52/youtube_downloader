import { useState, useEffect } from 'react'
import arrowForward from './assets/arrow_forward.png'
import { FidgetSpinner, ThreeDots } from 'react-loader-spinner'
import './App.css'


function ErrorAlert({message, onClose}){
  return (
    <div className="text-white px-6 py-4 border-0 rounded relative mb-4 bg-red-500 mt-5">
      <span className="text-xl inline-block mr-5 align-middle">
        <i className="fas fa-bell" />
      </span>
      <span className="inline-block align-middle mr-8">
        <b className="capitalize">Error!</b> {message}
      </span>
      <button onClick={onClose} className="absolute bg-transparent text-2xl font-semibold leading-none right-0 top-0 mt-4 mr-6 outline-none focus:outline-none">
        <span>×</span>
      </button>
    </div>
  )
}

function App() {

  const [url, setUrl] = useState('')
  const [downloadClicked , setDownloadClicked] = useState(false)
  const [videoInfo, setVideoInfo] = useState(null)
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState('')
  const [isErrorVisible, setIsErrorVisible] = useState(false)
  
  const handleUrlChange = (e) => {setUrl(e.target.value)}

  const onClickDownload = async (e) => {
    e.preventDefault();
    setDownloadClicked(true)
    setLoading(true)
    try{
      const response = await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({url})
      })
      if (!response.ok) {
        setError("Error:" + response.statusText)
        setIsErrorVisible(true)
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setVideoInfo(data)
    } catch (error) {
      setError(error.message)
      setIsErrorVisible(true)
    } finally {
      setLoading(false)
    }
  }

  const onClickContentDownload = async (e) => {
    e.preventDefault();
    setIsDownloading(true)
    setDownloadClicked(false)
    try {
        const response = await fetch('http://localhost:8000/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url, resolution: e.target.innerText })
        });
        
        if (!response.ok) {
          setError("Error:" + response.statusText)
          setIsErrorVisible(true)
          const errorText = await response.text();
          throw new Error(`${response.status} - ${response.statusText}: ${errorText}`);
        }
        const blob = await response.blob();
        const url2 = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url2;
        a.download = `${url}-${e.target.innerText}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url2);
    } catch (error) {
      setError(error.message)
      setIsErrorVisible(true)
      console.error('Error:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  useEffect(() => {
    console.log(isDownloading);
    if (isDownloading) {
      const eventSource = new EventSource('http://localhost:8000/progress');
      eventSource.onmessage = (event) => {
        const newProgress = parseFloat(event.data);
        setProgress(newProgress);
        console.log(newProgress);
      };
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
      };
      return () => {
        eventSource.close();
      };
    }
  }, [isDownloading]);

  return (
    <div className="App h-screen flex flex-col items-center">
      {isErrorVisible && <ErrorAlert 
        message={error} 
        onClose={() => {
          setIsErrorVisible(false);
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }} />
      }
      <div className='flex flex-col items-center justify-center pt-5 rounded-lg p-6'>
        <p className='sm:text-3xl text-2xl rounded-lg p-4 sm:w-full bg-green-200'>
          Youtube Video Downloader<br/>
          <span className='bg-red-100 border border-red-400 text-red-700 px-1 py-1 rounded relative mt-10 sm:text-lg text-sm'>
            <i><b>Note:</b> Some videos will have 720p only.</i>
          </span>
        </p>
        <form className='flex flex-col items-center justify-center'>
          <label className='mt-2 sm:text-2xl text-xl'>Paste the URL of the Youtube Video</label>
          <input type='text' className='mt-5 p-2 rounded-lg sm:w-96 w-full bg-gray-200 focus:outline-none focus:ring focus:ring-green-400' onChange={handleUrlChange}/>
          <button className='mt-5 p-2 bg-green-800 text-white rounded-lg sm:w-96 w-full hover:bg-green-700 hover:ring-2 ring-lime-400 ring-offset-2' onClick={onClickDownload}>Download</button>
        </form>
      </div>
      {downloadClicked && (
        <div className='mt-2 sm:w-96 w-80 flex flex-col rounded-md'>
          {loading ? (
            <div className='flex justify-center items-center h-32 mt-16'>
              <FidgetSpinner color="#00BFFF" height="180" width="180" />
            </div>
          ) : (
            videoInfo && (
              <>
                <p className='text-center sm:text-2xl text-xl mb-5 underline'>Info</p>
                <p className='sm:text-2xl text-xl mb-2'>Title: {videoInfo.title}</p>
                <img className="transition-all duration-200 hover:scale-105 rounded-lg cursor-pointer" src={videoInfo.thumbnail_url} alt="thumbnail" />
                <p className='sm:text-2xl text-xl mt-2 mb-2'>Available Resolutions:</p>
                <div className='flex flex-col items-start mb-5'>
                  {videoInfo.resolutions.map((res, index) => (
                    <div className='flex flex-row sm:w-96 w-full' key={index}>
                      <button onClick={onClickContentDownload} className='transition-all duration-200 hover:scale-110 sm:text-2xl text-xl bg-slate-300 p-2 rounded-md mb-2 sm:w-96 w-full flex flex-row items-center justify-between' key={index}>
                        {res} <span className='text-sm ml-auto mr-2'>{videoInfo.file_size[res]}</span>
                        <img src={arrowForward} alt="arrow forward" className='ml-2 w-6 h-6 bg-black rounded-xl p-1' />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}
      {isDownloading && (
        <div className='mt-4 sm:w-96 w-80 flex flex-col rounded-md items-center justify-center'>
          <p className='text-center sm:text-2xl text-xl'>Downloading...Please Wait</p>
          <ThreeDots width="140" height="140" />
        </div>
      )}
    </div>
  )
}


export default App
