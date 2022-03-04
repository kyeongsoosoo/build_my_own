import { bindActionCreators, createStore } from "../redux.js"
import songActions from "./songActions.js"
import songReducer from "./songReducer.js"

const elements = {
    player: {
      activeSong: document.getElementById("activeSong"),
      playPauseIcon: document.getElementById("playPauseIcon"),
      nextIcon: document.getElementById("nextIcon"),
      prevIcon: document.getElementById("prevIcon"),
    },
    songList: document.querySelector(".song-list"),
}

const songs =[
    {
      "title": "Lights Out, Words Gone",
      "artist": "Bombay Bicycle Club"
    },
    { "title": "Alter Ego", "artist": "Tame Impala" },
    { "title": "A Forest", "artist": "The Cure" },
    { "title": "Glorious Warrior", "artist": "Electric Guest" },
    { "title": "Tape Machine", "artist": "STRFKR" }
]
  

const store = createStore(songReducer)

store.subscribe(() => {
    const { activeSong, isPlaying } = store.getState()
    if(activeSong){
        elements.player.activeSong.innerHTML = `${activeSong.title} - ${activeSong.artist}`
    }
    if(isPlaying){
        elements.player.playPauseIcon.classList.add("fa-pause")
    }
    else{
        elements.player.playPauseIcon.classList.remove("fa-pause")
    }
})


const boundedActions = bindActionCreators(songActions, store.dispatch)

boundedActions.loadSongs(songs)

const renderSongList = (songs, activeSong, isPlaying, actions) => {
    const fragment = document.createDocumentFragment()
  
    while (elements.songList.firstChild) {
      elements.songList.removeChild(elements.songList.firstChild)
    }
    songs.forEach(song => {
      const li = document.createElement("li")
      const isActiveSong =
        isPlaying && activeSong && activeSong.title === song.title
      li.innerHTML = `
        <div class="song-item ${isActiveSong ? "active" : ""}">
          <div class="song-controls">
            <i class="fa ${isActiveSong ? "fa-pause" : "fa-play"}"></i>
          </div>
          <div class="song-content">
            <span>${song.title}</span>
            <span class="song-content-artist">${song.artist}</span>
          </div>
        </div>
      `
      li.addEventListener("click", () => {
        if (isActiveSong) {
          actions.togglePlay()
          return
        }
        actions.playSong(song)
      })
      fragment.appendChild(li)
    })
    elements.songList.appendChild(fragment)
}

store.subscribe(() => {
    const { songs, activeSong, isPlaying } = store.getState()
    renderSongList(songs, activeSong, isPlaying, boundedActions)
})

elements.player.nextIcon.addEventListener("click", () => {
    boundedActions.playNext()
})
elements.player.prevIcon.addEventListener("click", () => {
    boundedActions.playPrev()
})
elements.player.playPauseIcon.addEventListener("click", () =>
    boundedActions.togglePlay()
)