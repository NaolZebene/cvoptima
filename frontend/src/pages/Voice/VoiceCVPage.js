import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

// Icons
import {
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  TrashIcon,
  DownloadIcon,
  ClockIcon,
  TranslateIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/outline';

const VoiceCVPage = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  
  const { user } = useSelector((state) => state.auth);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  ];

  const canUseVoice = () => {
    if (!user) return false;
    const subscription = user.subscription?.type || 'free';
    return subscription === 'premium' || subscription === 'enterprise';
  };

  const startRecording = async () => {
    if (!canUseVoice()) {
      toast.error('Voice features require Premium subscription');
      navigate('/subscription');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newRecording = {
          id: Date.now(),
          url: audioUrl,
          blob: audioBlob,
          duration: recordingTime,
          timestamp: new Date().toISOString(),
          language: selectedLanguage,
        };
        
        setRecordings([newRecording, ...recordings]);
        setRecordingTime(0);
        clearInterval(timerRef.current);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started... Speak clearly about your experience.');
    } catch (error) {
      toast.error('Failed to access microphone. Please check permissions.');
      console.error('Microphone error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const playRecording = (url) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const deleteRecording = (id) => {
    setRecordings(recordings.filter(rec => rec.id !== id));
    toast.success('Recording deleted');
  };

  const transcribeRecording = async (recording) => {
    if (!canUseVoice()) {
      toast.error('Voice transcription requires Premium subscription');
      navigate('/subscription');
      return;
    }

    setIsTranscribing(true);
    toast.loading('Transcribing audio... This may take a moment.');
    
    // Simulate API call
    setTimeout(() => {
      const mockTranscription = `This is a mock transcription of your ${recording.duration} second recording in ${languages.find(l => l.code === recording.language)?.name}.
      
I have over 5 years of experience as a software engineer specializing in full-stack development. My expertise includes JavaScript, React, Node.js, and cloud technologies like AWS.

In my previous role at TechCorp, I led a team of 5 developers to build a scalable e-commerce platform that increased sales by 35%. I implemented CI/CD pipelines that reduced deployment time by 60%.

I'm passionate about clean code, agile methodologies, and mentoring junior developers. I hold a Bachelor's degree in Computer Science from State University.`;

      setTranscription(mockTranscription);
      setIsTranscribing(false);
      toast.success('Transcription completed!');
    }, 2000);
  };

  const createCVFromTranscription = () => {
    if (!transcription.trim()) {
      toast.error('Please transcribe a recording first');
      return;
    }

    toast.success('CV created from transcription! Redirecting to editor...');
    // In a real app, this would call an API and navigate to CV editor
    setTimeout(() => {
      navigate('/cv/upload');
    }, 1500);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!canUseVoice()) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Voice CV Creation</h1>
          <p className="mt-2 text-gray-600">
            Create professional CVs by simply speaking about your experience.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <MicrophoneIcon className="h-12 w-12 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Voice Features Require Premium
          </h2>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Voice-based CV creation is available with our Premium plan. Upgrade to unlock this powerful feature and create CVs by simply speaking.
          </p>
          
          <div className="space-y-4 max-w-md mx-auto">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Premium Plan Benefits</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Voice-based CV creation
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Unlimited CV analyses
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  All industry keyword packs
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Priority support
                </li>
              </ul>
            </div>
            
            <button
              onClick={() => navigate('/subscription')}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:opacity-90"
            >
              Upgrade to Premium - €19.99/month
            </button>
            
            <button
              onClick={() => navigate('/cv/upload')}
              className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Or upload CV manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Voice CV Creation</h1>
        <p className="mt-2 text-gray-600">
          Create professional CVs by simply speaking about your experience. Our AI will transcribe and structure it for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Recording controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recording card */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Your Experience</h2>
            
            <div className="space-y-6">
              {/* Language selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TranslateIcon className="inline h-4 w-4 mr-1" />
                  Select Language
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {languages.slice(0, 12).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        selectedLanguage === lang.code
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-lg mb-1">{lang.flag}</div>
                      <div className="text-xs text-gray-600">{lang.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recording controls */}
              <div className="text-center">
                <div className="mb-6">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isRecording ? 'Recording...' : 'Ready to record'}
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  {isRecording ? (
                    <button
                      onClick={stopRecording}
                      className="flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                    >
                      <StopIcon className="h-8 w-8" />
                    </button>
                  ) : (
                    <button
                      onClick={startRecording}
                      className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:opacity-90 shadow-lg"
                    >
                      <MicrophoneIcon className="h-8 w-8" />
                    </button>
                  )}
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  {isRecording
                    ? 'Speak clearly about your experience, education, and skills'
                    : 'Click the microphone to start recording'}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Recording Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Speak clearly and at a moderate pace
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Mention your job titles, companies, and dates
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Include quantifiable achievements and results
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Talk about your education, skills, and certifications
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Recordings list */}
          {recordings.length > 0 && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Recordings</h2>
              <div className="space-y-4">
                {recordings.map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <MicrophoneIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">
                          Recording {new Date(recording.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatTime(recording.duration)} • {languages.find(l => l.code === recording.language)?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => playRecording(recording.url)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => transcribeRecording(recording)}
                        disabled={isTranscribing}
                        className="px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                      </button>
                      <button
                        onClick={() => deleteRecording(recording.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcription result */}
          {transcription && (
            <div className="bg-white rounded-xl shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Transcription Result</h2>
                <button
                  onClick={createCVFromTranscription}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:opacity-90"
                >
                  Create CV
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <textarea
                  value={transcription}
                  onChange={(e) => setTranscription(e.target.value)}
                  rows="8"
                  className="w-full bg-transparent border-none focus:outline-none text-gray-700"
                />
              </div>
              
              <div className="flex justify-between text-sm text-gray-500">
                <span>{transcription.split(/\s+/).length} words</span>
                <span>{transcription.length} characters</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Info and actions */}
        <div className="space-y-6">
          {/* Job description */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Target Job Description</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Add job description for better CV targeting (optional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows="4"
                  className="w-full form-input"
                  placeholder="Paste the job description you're targeting. This helps our AI structure your CV appropriately."
                />
              </div>
              <div className="text-sm text-gray-500">
                <InformationCircleIcon className="inline h-4 w-4 mr-1" />
                Adding a job description helps tailor your CV to specific requirements.
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    1
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Record Your Experience</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Speak naturally about your work history, education, and skills.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                    2
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">AI Transcription</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Our AI transcribes and structures your speech into organized text.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                    3
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">CV Creation</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Create a professional CV with proper formatting and ATS optimization.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick tips */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Quick Tips</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Record in a quiet environment</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Speak at a natural pace - not too fast or slow</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Mention specific achievements with numbers</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-300 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Keep recordings under 5 minutes for best results</span>
              </li>
            </ul>
          </div>

          {/* Audio player (hidden) */}
          <audio ref={audioRef} className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default VoiceCVPage;
