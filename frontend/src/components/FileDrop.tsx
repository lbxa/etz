import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { useGoogle } from "@/hooks";

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function FileDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { uploadFiles } = useGoogle();

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Add a small delay or check relatedTarget to prevent flickering when dragging over child elements
    if (e.relatedTarget && !(e.currentTarget as HTMLDivElement).contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    } else if (!e.relatedTarget) { // Handles leaving the window/dropzone entirely
        setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.stopPropagation();
    setIsDragging(true); // Keep highlighting while dragging over
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadStatus('idle');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      console.log("Files dropped:", files);
      setDroppedFiles(prevFiles => [...prevFiles, ...files]); // Handle dropped files
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setUploadStatus('idle');
     if (e.target.files && e.target.files.length > 0) {
       const files = Array.from(e.target.files);
       console.log("Files selected:", files);
       setDroppedFiles(prevFiles => [...prevFiles, ...files]); // Handle selected files
     }
  };

  const handleUpload = async () => {
    if (droppedFiles.length === 0 || uploadStatus === 'uploading') {
      return;
    }

    setUploadStatus('uploading');
    console.log("Starting upload for:", droppedFiles);

    try {
      // const uploadedUrls = await uploadFiles(droppedFiles);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const uploadedUrls = ['https://storage.googleapis.com/arxiv-audio-store/lib/podcast.mp3'];
      console.log("Upload complete. Uploaded URLs:", uploadedUrls);
      setUploadStatus('success');
      
      // Set the first uploaded URL as our audio source
      if (uploadedUrls && uploadedUrls.length > 0) {
        setAudioUrl(uploadedUrls[0]);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus('error');
      setAudioUrl(null);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <Card
        className={`w-full max-w-2xl border-2 border-dashed transition-colors duration-300 ease-in-out ${
          isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold">Create Your Family Podcast</CardTitle>
          <CardDescription>Upload your audio stories, and we'll craft a podcast episode for you.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 p-16">
           <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2 text-center w-full">
            <UploadCloud className={`h-16 w-16 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-lg font-medium text-foreground">
                {isDragging ? "Drop audio files here" : "Drag & drop audio files here, or click to select"}
            </span>
            <Input id="file-upload" type="file" className="hidden" multiple onChange={handleFileChange} accept="audio/*" disabled={uploadStatus === 'uploading'} />
          </label>

           {/* Display dropped file names */}
           {droppedFiles.length > 0 && (
             <div className="mt-4 w-full text-center">
               <h4 className="text-md font-medium mb-2">Selected Audio Files:</h4>
               <ul className="list-none bg-muted/50 p-4 rounded-md max-h-40 overflow-y-auto mb-4 text-left">
                 {droppedFiles.map((file, index) => (
                   <li key={index} className="text-sm text-muted-foreground truncate p-1">{file.name}</li>
                 ))}
               </ul>
                <Button
                    onClick={handleUpload}
                    disabled={droppedFiles.length === 0 || uploadStatus === 'uploading'}
                    size="lg"
                 >
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Files'}
                 </Button>

                 {uploadStatus === 'success' && <p className="text-green-600 mt-2">Upload successful!</p>}
                 {uploadStatus === 'error' && <p className="text-red-600 mt-2">Upload failed. Please try again.</p>}
             </div>
           )}
           
           {/* Audio Player */}
           {uploadStatus === 'success' && audioUrl && (
             <div className="w-full mt-6">
               <h4 className="text-md font-medium mb-2">Your Podcast</h4>
               <div className="bg-muted/30 p-4 rounded-md">
                 <audio 
                   controls 
                   className="w-full" 
                   src={audioUrl}
                 >
                   Your browser does not support the audio element.
                 </audio>
               </div>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}