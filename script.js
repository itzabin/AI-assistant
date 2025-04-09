// Ensure DOM is fully loaded before running script
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startBtn = document.getElementById('start-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const backBtn = document.getElementById('back-btn');
    const textOutput = document.getElementById('text-output');
    const debugOutput = document.getElementById('debug-output');
    const weatherIcon = document.getElementById('weather-icon');
    const timerDisplay = document.getElementById('timer-display');
    const timerCountdown = document.getElementById('timer-countdown');
    const musicPlayer = document.getElementById('music-player');
    const cameraFeed = document.getElementById('camera-feed');
    const mainContainer = document.getElementById('main-container');
    const settingsContainer = document.getElementById('settings-container');
    const appSettings = document.getElementById('app-settings');

    // Configuration (replace these in VS Code before running)
    const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Get from openweathermap.org
    const NEWS_API_KEY = 'YOUR_NEWSAPI_KEY'; // Get from newsapi.org
    const DEFAULT_VOLUME = 0.5;
    const DEBUG_ENABLED = true;

    // State
    let timerInterval = null;
    let cameraStream = null;
    let currentTrackIndex = 0;
    let currentPlaylist = 'default';
    const apps = JSON.parse(localStorage.getItem('customApps')) || {
        "calculator": "https://www.google.com/search?q=calculator",
        "youtube": "https://www.youtube.com",
        "docs": "https://docs.google.com",
        "maps": "https://maps.google.com",
        "notion": "https://www.notion.so",
        "spotify": "https://open.spotify.com",
        "gmail": "https://mail.google.com",
        "twitter": "https://twitter.com"
    };
    const playlists = {
        "default": [
            { title: "Track 1", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
            { title: "Track 2", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
            { title: "Track 3", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' }
        ],
        "chill": [
            { title: "Chill 1", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
            { title: "Chill 2", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' }
        ]
    };

    // Utilities
    const beepSound = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
    const synth = window.speechSynthesis;

    function log(message, isError = false) {
        if (DEBUG_ENABLED) {
            const timestamp = new Date().toLocaleTimeString();
            const span = document.createElement('span');
            span.textContent = `[${timestamp}] ${message}`;
            span.className = isError ? 'debug-error' : 'debug-success';
            debugOutput.appendChild(span);
            debugOutput.appendChild(document.createElement('br'));
            debugOutput.scrollTop = debugOutput.scrollHeight;
            // Also log to console for VS Code debugging
            console[isError ? 'error' : 'log'](`[${timestamp}] ${message}`);
        }
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.onerror = (e) => log(`Speech error: ${e.error}`, true);
        synth.speak(utterance);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    // Event Listener Functions (for easy removal)
    const startListening = () => {
        textOutput.textContent = "Listening...";
        log("Starting speech recognition.");
        startBtn.classList.add('listening');
        listenForCommand();
    };

    const showSettings = () => {
        mainContainer.style.display = 'none';
        settingsContainer.style.display = 'block';
        loadSettings();
    };

    const hideSettings = () => {
        mainContainer.style.display = 'block';
        settingsContainer.style.display = 'none';
    };

    const saveAndHideSettings = () => {
        saveSettings();
        mainContainer.style.display = 'block';
        settingsContainer.style.display = 'none';
    };

    const handleMusicEnd = () => {
        if (currentTrackIndex < playlists[currentPlaylist].length - 1) {
            nextTrack();
        } else {
            stopMusic();
            speak("Playlist ended.");
        }
    };

    const cleanup = () => {
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        if (timerInterval) clearInterval(timerInterval);
    };

    // Add Event Listeners
    startBtn.addEventListener('click', startListening);
    settingsBtn.addEventListener('click', showSettings);
    backBtn.addEventListener('click', hideSettings);
    saveSettingsBtn.addEventListener('click', saveAndHideSettings);
    musicPlayer.addEventListener('ended', handleMusicEnd);
    window.addEventListener('unload', cleanup);

    // Speech Handling
    function listenForCommand() {
        if (!recognition) {
            textOutput.textContent = "Speech Recognition not supported.";
            log("SpeechRecognition API unavailable.", true);
            startBtn.classList.remove('listening');
            return;
        }

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.start();

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase().trim();
            textOutput.textContent = `You said: "${command}"`;
            log("Command recognized.");
            processCommand(command);
            startBtn.classList.remove('listening');
        };

        recognition.onerror = (event) => {
            textOutput.textContent = `Error: ${event.error}`;
            log(`Recognition error: ${event.error}`, true);
            startBtn.classList.remove('listening');
        };

        recognition.onend = () => {
            log("Recognition ended.");
            startBtn.classList.remove('listening');
        };
    }

    // Command Processing
    async function processCommand(command) {
        let response = "";
        weatherIcon.style.display = "none";
        timerDisplay.style.display = "none";
        musicPlayer.style.display = "none";
        if (cameraFeed) cameraFeed.style.display = "none";

        try {
            if (command.includes("what time is it")) {
                response = `The current time is ${new Date().toLocaleTimeString()}.`;
            } else if (command.includes("tell me a joke")) {
                response = "Why don't skeletons fight each other? Because they don't have the guts!";
            } else if (command.includes("what's your name")) {
                response = "I'm your AI assistant, call me Grok!";
            } else if (command.includes("what's the weather in")) {
                const city = command.split("what's the weather in")[1]?.trim();
                response = city ? await getWeather(city) : "Please specify a city.";
            } else if (command.includes("tell me the news")) {
                response = await getNews();
            } else if (command.includes("set a timer for")) {
                const minutes = parseInt(command.match(/\d+/));
                response = minutes ? setTimer(minutes) : "Please specify a number of minutes.";
            } else if (command.includes("stop timer")) {
                response = stopTimer();
            } else if (command.includes("open app")) {
                const parts = command.split("open app")[1]?.trim().split(" and search for ");
                response = openApp(parts[0]?.trim(), parts[1]?.trim());
            } else if (command.includes("add app")) {
                const parts = command.split("add app")[1]?.trim().split(" ");
                response = addApp(parts[0], parts.slice(1).join(" "));
            } else if (command.includes("remove app")) {
                response = removeApp(command.split("remove app")[1]?.trim());
            } else if (command.includes("play playlist")) {
                response = playPlaylist(command.split("play playlist")[1]?.trim() || 'default');
            } else if (command.includes("play music")) {
                response = playPlaylist('default');
            } else if (command.includes("pause music")) {
                response = pauseMusic();
            } else if (command.includes("resume music")) {
                response = resumeMusic();
            } else if (command.includes("stop music")) {
                response = stopMusic();
            } else if (command.includes("next track")) {
                response = nextTrack();
            } else if (command.includes("previous track")) {
                response = previousTrack();
            } else if (command.includes("increase volume")) {
                response = increaseVolume();
            } else if (command.includes("decrease volume")) {
                response = decreaseVolume();
            } else if (command.includes("open camera")) {
                response = await openCamera();
            } else if (command.includes("close camera")) {
                response = closeCamera();
            } else {
                response = "Try 'play playlist [name]', 'increase volume', 'add app [name] [url]', etc.";
            }
        } catch (error) {
            response = `Error: ${error.message}`;
            log(`Command error: ${error.message}`, true);
        }

        speak(response);
        textOutput.textContent = response;
    }

    // API Calls
    async function getWeather(city) {
        if (WEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
            return "Please set a valid OpenWeatherMap API key in script.js.";
        }
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("City not found");
            const data = await response.json();
            weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
            weatherIcon.style.display = "block";
            return `The weather in ${city} is ${data.weather[0].description} with a temperature of ${data.main.temp}°C.`;
        } catch (error) {
            log(`Weather fetch failed: ${error.message}`, true);
            return `Sorry, I couldn't fetch the weather for ${city}.`;
        }
    }

    async function getNews() {
        if (NEWS_API_KEY === 'YOUR_NEWSAPI_KEY') {
            return "Please set a valid NewsAPI key in script.js.";
        }
        try {
            const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("News fetch failed");
            const data = await response.json();
            return `Here's the latest news: ${data.articles[0].title}, by ${data.articles[0].source.name}.`;
        } catch (error) {
            log(`News fetch failed: ${error.message}`, true);
            return "Sorry, I couldn't fetch the news right now.";
        }
    }

    // Timer Functions
    function setTimer(minutes) {
        if (timerInterval) clearInterval(timerInterval);
        let secondsLeft = minutes * 60;
        timerDisplay.style.display = "block";
        timerCountdown.textContent = formatTime(secondsLeft);

        timerInterval = setInterval(() => {
            secondsLeft--;
            timerCountdown.textContent = formatTime(secondsLeft);
            if (secondsLeft <= 0) {
                clearInterval(timerInterval);
                beepSound.play();
                speak("Time's up!");
                textOutput.textContent = "Timer finished!";
                timerDisplay.style.display = "none";
                timerInterval = null;
            }
        }, 1000);

        return `Timer set for ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerDisplay.style.display = "none";
            return "Timer stopped.";
        }
        return "No active timer to stop.";
    }

    // App Functions
    function openApp(appName, searchQuery) {
        if (!appName) return "Please specify an app.";
        if (apps[appName]) {
            let url = apps[appName];
            if (searchQuery) {
                if (appName === "youtube") url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
                else if (appName === "maps") url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
            }
            window.open(url, '_blank');
            return searchQuery ? `Opening ${appName} and searching for ${searchQuery}.` : `Opening ${appName}.`;
        }
        if (appName.startsWith('http')) {
            window.open(appName, '_blank');
            return `Opening custom URL: ${appName}.`;
        }
        return "App not found.";
    }

    function addApp(appName, url) {
        if (!appName || !url) return "Please provide both an app name and a URL.";
        if (!url.match(/^https?:\/\/.+/)) return "Invalid URL. Use 'http://' or 'https://'.";
        apps[appName] = url;
        localStorage.setItem('customApps', JSON.stringify(apps));
        return `Added app ${appName} with URL ${url}.`;
    }

    function removeApp(appName) {
        if (appName && apps[appName]) {
            delete apps[appName];
            localStorage.setItem('customApps', JSON.stringify(apps));
            return `Removed app ${appName}.`;
        }
        return "App not found.";
    }

    // Music Functions
    function playPlaylist(playlistName) {
        if (!playlists[playlistName]) return "Playlist not found. Try 'default' or 'chill'.";
        currentPlaylist = playlistName;
        currentTrackIndex = 0;
        musicPlayer.src = playlists[currentPlaylist][currentTrackIndex].url;
        musicPlayer.volume = DEFAULT_VOLUME;
        musicPlayer.style.display = "block";
        musicPlayer.play();
        return `Playing ${playlists[currentPlaylist][currentTrackIndex].title} from ${playlistName} playlist.`;
    }

    function pauseMusic() {
        if (!musicPlayer.paused) {
            musicPlayer.pause();
            return "Music paused.";
        }
        return "Music is not playing.";
    }

    function resumeMusic() {
        if (musicPlayer.paused) {
            musicPlayer.play();
            return "Music resumed.";
        }
        return "Music is already playing or not started.";
    }

    function stopMusic() {
        if (!musicPlayer.paused) {
            musicPlayer.pause();
            musicPlayer.currentTime = 0;
            musicPlayer.style.display = "none";
            return "Music stopped.";
        }
        return "No music is playing.";
    }

    function nextTrack() {
        if (currentTrackIndex < playlists[currentPlaylist].length - 1) {
            currentTrackIndex++;
            musicPlayer.src = playlists[currentPlaylist][currentTrackIndex].url;
            musicPlayer.play();
            return `Playing next track: ${playlists[currentPlaylist][currentTrackIndex].title}.`;
        }
        return "No more tracks in the playlist.";
    }

    function previousTrack() {
        if (currentTrackIndex > 0) {
            currentTrackIndex--;
            musicPlayer.src = playlists[currentPlaylist][currentTrackIndex].url;
            musicPlayer.play();
            return `Playing previous track: ${playlists[currentPlaylist][currentTrackIndex].title}.`;
        }
        return "This is the first track.";
    }

    function increaseVolume() {
        if (musicPlayer.volume < 1.0) {
            musicPlayer.volume = Math.min(1.0, musicPlayer.volume + 0.1);
            return `Volume increased to ${(musicPlayer.volume * 100).toFixed(0)}%.`;
        }
        return "Volume is already at maximum.";
    }

    function decreaseVolume() {
        if (musicPlayer.volume > 0.0) {
            musicPlayer.volume = Math.max(0.0, musicPlayer.volume - 0.1);
            return `Volume decreased to ${(musicPlayer.volume * 100).toFixed(0)}%.`;
        }
        return "Volume is already at minimum.";
    }

    // Camera Functions
    async function openCamera() {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            return "Camera requires HTTPS. Use a local HTTPS server or deploy to an HTTPS host.";
        }
        try {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraFeed.srcObject = cameraStream;
            cameraFeed.style.display = "block";
            return "Camera opened.";
        } catch (error) {
            log(`Camera error: ${error.message}`, true);
            return "Failed to open camera. Ensure camera permission is granted.";
        }
    }

    function closeCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
            cameraFeed.style.display = "none";
            return "Camera closed.";
        }
        return "Camera is not open.";
    }

    // Settings Functions
    function loadSettings() {
        appSettings.innerHTML = '';
        for (const [name, url] of Object.entries(apps)) {
            const div = document.createElement('div');
            div.className = 'app-setting';
            div.innerHTML = `<label>${name}</label><input type="text" value="${url}" data-name="${name}">`;
            appSettings.appendChild(div);
        }
    }

    function saveSettings() {
        const inputs = appSettings.querySelectorAll('input');
        const newApps = {};
        inputs.forEach(input => {
            const name = input.getAttribute('data-name');
            const url = input.value.trim();
            if (url) newApps[name] = url;
        });
        Object.assign(apps, newApps);
        localStorage.setItem('customApps', JSON.stringify(apps));
        speak("Settings saved.");
        log("Settings saved to localStorage.");
    }

    // Initialize
    log("AI Assistant initialized in VS Code.");
});