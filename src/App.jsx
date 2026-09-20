import {
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import ChessApp from './chess/ChessApp'
import foxyJumpscare from './assets/foxy-jumpscare.gif'
import foxyScream from './assets/foxy-jumpscare.mp3'
import emailPfp from './assets/email-pfp.png'
import bottomLeftGif from './assets/attachment-2.gif'

const GITHUB_URL = 'https://github.com/Tetousz'
const REPO_URL = 'https://github.com/Tetousz/website'
const DISCORD_URL =
  'https://discord.com/users/983752650627620944'
const EMAIL_URL = 'mailto:ferretusz@gmail.com'
const VIDEO_ID = '8nPcrz4mZQM'
const GITHUB_CONTRIBUTIONS_URL =
  'https://hxjejlwxunkuiodpmmwt.supabase.co/functions/v1/github-contributions'
const VISITOR_COUNTER_URL =
  'https://hxjejlwxunkuiodpmmwt.supabase.co/functions/v1/visitor-counter'
const DISCORD_PROFILE_URL =
  'https://hxjejlwxunkuiodpmmwt.supabase.co/functions/v1/discord-profile'

function App() {
  const path = window.location.pathname

  if (path.startsWith('/chess')) {
    return <ChessApp />
  }

  if (
    path === '/portfolio' ||
    path === '/portfolio/'
  ) {
    return <PortfolioComingSoon />
  }

  return <Home />
}

function Home() {
  const [contactsOpen, setContactsOpen] =
    useState(false)

  const [gamesOpen, setGamesOpen] =
    useState(false)

  const [fishOpen, setFishOpen] =
    useState(false)
  const [fishPosition, setFishPosition] =
    useState(null)
  const fishDragRef = useRef(null)
  const [nineBenzineOpen, setBenzineOpen] =
    useState(false)
  const [nineBenzinePosition, setBenzinePosition] =
    useState(null)
  const nineBenzineDragRef = useRef(null)

  const [jumpscareActive, setJumpscareActive] =
    useState(false)

  const jumpscareAudioRef = useRef(null)
  const jumpscareGifTimerRef = useRef(null)
  const jumpscareAudioTimerRef = useRef(null)

  const [theme, setTheme] = useState(() => {
    const saved =
      localStorage.getItem('ferretusz-theme')

    if (saved === 'light' || saved === 'dark') {
      return saved
    }

    return window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(
      'ferretusz-theme',
      theme
    )
  }, [theme])

  useEffect(() => {
    return () => {
      jumpscareAudioRef.current?.pause()

      if (jumpscareGifTimerRef.current) {
        window.clearTimeout(
          jumpscareGifTimerRef.current
        )
      }

      if (jumpscareAudioTimerRef.current) {
        window.clearTimeout(
          jumpscareAudioTimerRef.current
        )
      }
    }
  }, [])

  function triggerJumpscare() {
    if (jumpscareGifTimerRef.current) {
      window.clearTimeout(
        jumpscareGifTimerRef.current
      )
    }

    /*
     * The supplied GIF is 14 frames at 60 ms each:
     * 14 × 60 ms = 840 ms for exactly one animation.
     *
     * Remove it after 840 ms so the GIF never gets the
     * chance to begin its second loop.
     */
    setJumpscareActive(true)

    jumpscareGifTimerRef.current =
      window.setTimeout(() => {
        setJumpscareActive(false)
      }, 840)

    const audio =
      jumpscareAudioRef.current

    if (audio) {
      if (jumpscareAudioTimerRef.current) {
        window.clearTimeout(
          jumpscareAudioTimerRef.current
        )
      }

      audio.pause()
      audio.currentTime = 0
      audio.loop = false
      audio.volume = 1

      const playAudio = () => {
        audio.play().catch(() => {})

        const cutoffSeconds = 0.6
        const playForMilliseconds = Math.max(
          0,
          (audio.duration - cutoffSeconds) * 1000
        )

        jumpscareAudioTimerRef.current =
          window.setTimeout(() => {
            audio.pause()
            audio.currentTime = 0
          }, playForMilliseconds)
      }

      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        playAudio()
      } else {
        audio.addEventListener(
          'loadedmetadata',
          playAudio,
          { once: true }
        )

        audio.load()
      }
    }
  }

  function finishJumpscare() {
    setJumpscareActive(false)

    if (jumpscareGifTimerRef.current) {
      window.clearTimeout(
        jumpscareGifTimerRef.current
      )

      jumpscareGifTimerRef.current = null
    }

    if (jumpscareAudioTimerRef.current) {
      window.clearTimeout(
        jumpscareAudioTimerRef.current
      )

      jumpscareAudioTimerRef.current = null
    }

    const audio =
      jumpscareAudioRef.current

    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }

  function startNineBenzineDrag(event) {
    const windowElement =
      event.currentTarget.parentElement
    const rect =
      windowElement.getBoundingClientRect()

    nineBenzineDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }

    setBenzinePosition({
      left: rect.left,
      top: rect.top,
    })

    event.currentTarget.setPointerCapture(
      event.pointerId
    )
  }

  function moveNineBenzineDrag(event) {
    const drag = nineBenzineDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const windowElement =
      event.currentTarget.parentElement

    const maxLeft = Math.max(
      0,
      window.innerWidth - windowElement.offsetWidth
    )
    const maxTop = Math.max(
      0,
      window.innerHeight - windowElement.offsetHeight
    )

    setBenzinePosition({
      left: Math.min(
        Math.max(0, event.clientX - drag.offsetX),
        maxLeft
      ),
      top: Math.min(
        Math.max(0, event.clientY - drag.offsetY),
        maxTop
      ),
    })
  }

  function stopNineBenzineDrag(event) {
    const drag = nineBenzineDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    nineBenzineDragRef.current = null

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      )
    }
  }

  function startFishDrag(event) {
    if (event.target.closest('.fish-window-close')) return

    const fishWindow = event.currentTarget.parentElement
    const rect = fishWindow.getBoundingClientRect()

    fishDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }

    setFishPosition({
      left: rect.left,
      top: rect.top,
    })

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveFishDrag(event) {
    const drag = fishDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const fishWindow = event.currentTarget.parentElement
    const maxLeft = Math.max(
      0,
      window.innerWidth - fishWindow.offsetWidth
    )
    const maxTop = Math.max(
      0,
      window.innerHeight - fishWindow.offsetHeight
    )

    setFishPosition({
      left: Math.min(
        Math.max(0, event.clientX - drag.offsetX),
        maxLeft
      ),
      top: Math.min(
        Math.max(0, event.clientY - drag.offsetY),
        maxTop
      ),
    })
  }

  function stopFishDrag(event) {
    if (
      !fishDragRef.current ||
      fishDragRef.current.pointerId !== event.pointerId
    ) {
      return
    }

    fishDragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <main className="landing">
      <div className="background-mark mark-one">
        福
      </div>

      <div className="background-mark mark-two">
        匈
      </div>

      <button
        type="button"
        className="theme-switch"
        onClick={() =>
          setTheme((current) =>
            current === 'light'
              ? 'dark'
              : 'light'
          )
        }
        aria-label={`Switch to ${
          theme === 'light' ? 'dark' : 'light'
        } mode`}
      >
        <span className="theme-symbol">
          {theme === 'light' ? '月' : '日'}
        </span>

        <span>
          {theme === 'light' ? 'DARK' : 'LIGHT'}
        </span>
      </button>

      <div className="hello">
        <span className="tiny-chinese">你好</span>

        <span>Hello I&apos;m</span>

        <button
          type="button"
          className="ferretusz-trigger"
          onClick={triggerJumpscare}
          aria-label="Ferretusz"
        >
          Ferretusz
        </button>
      </div>

      <div className="contacts-position">
        <button
          type="button"
          className="plain-link contacts-button"
          onClick={() =>
            setContactsOpen(
              (current) => !current
            )
          }
          aria-expanded={contactsOpen}
        >
          Contacts
        </button>

        <div
          className={`contact-pop ${
            contactsOpen ? 'open' : ''
          }`}
        >
          <ContactBubble
            className="contact-discord"
            label="Discord"
            href={DISCORD_URL}
            open={contactsOpen}
            preview={
              <DiscordContactCard />
            }
          />

          <ContactBubble
            className="contact-email"
            label="Email"
            href={EMAIL_URL}
            open={contactsOpen}
            preview={
              <EmailContactCard />
            }
          />
        </div>
      </div>

      <a
        className="plain-link repo-position"
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
      >
        Web source
        <span className="hover-arrow">↗</span>
      </a>

      <a
        className="plain-link github-position"
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
      >
        Github
        <span className="hover-arrow">↗</span>
      </a>

      <div className="games-position">
        <button
          type="button"
          className="plain-link games-button"
          onClick={() =>
            setGamesOpen(
              (current) => !current
            )
          }
          aria-expanded={gamesOpen}
          aria-label="Games"
        >
          Games{' '}
          <span className="new-tag">
            (New addition)
          </span>
        </button>

        <div
          className={`games-pop ${
            gamesOpen ? 'open' : ''
          }`}
        >
          <a
            className="game-circle"
            href="/chess"
            tabIndex={gamesOpen ? 0 : -1}
          >
            <span>Chess</span>
          </a>
        </div>
      </div>

      <a
        className="plain-link portfolio-position"
        href="/portfolio"
      >
        Portfolio
        <span className="hover-arrow">→</span>
      </a>

      <ProfileCard />

      <MusicPlayer />

      <VisitorLine />

      <button
        type="button"
        className="nine-benzine-desktop-icon"
        onDoubleClick={() => setBenzineOpen(true)}
        aria-label="Open 9 Benzine (double click)"
      >
        <span className="fih-retro-icon" aria-hidden="true">
          <span className="nine-benzine-retro-glyph">9</span>
        </span>
        <span className="fih-file-name">9</span>
      </button>

      {nineBenzineOpen && (
        <div
          className="nine-benzine-window"
          role="dialog"
          aria-label="9 Benzine"
          style={
            nineBenzinePosition
              ? {
                  left: `${nineBenzinePosition.left}px`,
                  top: `${nineBenzinePosition.top}px`,
                  transform: 'none',
                }
              : undefined
          }
        >
          <div
            className="nine-nine-benzine-window-titlebar"
            onPointerDown={startNineBenzineDrag}
            onPointerMove={moveNineBenzineDrag}
            onPointerUp={stopNineBenzineDrag}
            onPointerCancel={stopNineBenzineDrag}
          >
            <span>9 Benzine</span>

            <button
              type="button"
              className="nine-nine-benzine-window-close"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                setBenzineOpen(false)
              }}
              aria-label="Close 9 Benzine"
            >
              ×
            </button>
          </div>

          <div className="nine-nine-benzine-window-content">
            <img
              className="nine-benzine-gif"
              src={bottomLeftGif}
              alt="9 Benzine"
            />
          </div>
        </div>
      )}

      <div className="love-note">
        爱你亲爱的！
      </div>

      <button
        type="button"
        className="fih-desktop-icon"
        onDoubleClick={() => setFishOpen(true)}
        aria-label="Open fih (double click)"
      >
        <span className="fih-retro-icon" aria-hidden="true">
          <span className="fih-retro-glyph">▤</span>
        </span>
        <span className="fih-file-name">fih</span>
      </button>

      {fishOpen && (
        <div
          className="fish-window"
          role="dialog"
          aria-label="Spinning fish"
          style={
            fishPosition
              ? {
                  left: `${fishPosition.left}px`,
                  top: `${fishPosition.top}px`,
                  transform: 'none',
                }
              : undefined
          }
        >
          <div
            className="fish-window-titlebar"
            onPointerDown={startFishDrag}
            onPointerMove={moveFishDrag}
            onPointerUp={stopFishDrag}
            onPointerCancel={stopFishDrag}
          >
            <span>fih</span>

            <button
              type="button"
              className="fish-window-close"
              onClick={() => setFishOpen(false)}
              aria-label="Close fih"
            >
              ×
            </button>
          </div>

          <div className="fish-window-content">
            <img
              className="spinning-fish"
              src="https://spinning.fish/fish.gif"
              alt="Spinning fish"
            />

            <p className="fish-credit">
              I &quot;borrowed&quot; this from{' '}
              <a
                href="https://weanty.monster/"
                target="_blank"
                rel="noreferrer"
              >
                weanty.monster
              </a>
              , check out that site as well.
            </p>
          </div>
        </div>
      )}

      <audio
        ref={jumpscareAudioRef}
        src={foxyScream}
        preload="auto"
        loop={false}
      />

      {jumpscareActive && (
        <div
          className="jumpscare"
          role="presentation"
          onClick={finishJumpscare}
        >
          <img
            src={foxyJumpscare}
            alt=""
            draggable="false"
          />
        </div>
      )}
    </main>
  )
}

function ContactBubble({
  className,
  label,
  href,
  open,
  preview = null,
}) {
  const external =
    href.startsWith('http')

  return (
    <div
      className={`contact-item ${className}`}
    >
      <a
        className="contact-circle"
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        tabIndex={open ? 0 : -1}
      >
        <span>{label}</span>
      </a>

      {preview && (
        <div className="contact-card-preview">
          {preview}
        </div>
      )}
    </div>
  )
}

function DiscordContactCard() {
  const [profile, setProfile] = useState({
    loading: true,
    error: false,
    data: null,
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadDiscordProfile() {
      try {
        const response = await fetch(
          DISCORD_PROFILE_URL,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          throw new Error(
            `Discord profile request failed: ${response.status}`
          )
        }

        const data = await response.json()

        if (!data?.username) {
          throw new Error(
            'Discord profile returned invalid data'
          )
        }

        setProfile({
          loading: false,
          error: false,
          data,
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        console.error(
          'Could not load Discord profile:',
          error
        )

        setProfile({
          loading: false,
          error: true,
          data: null,
        })
      }
    }

    loadDiscordProfile()

    return () => {
      controller.abort()
    }
  }, [])

  const data = profile.data

  let accentStyle

  if (
    data?.accentColor !== null &&
    data?.accentColor !== undefined
  ) {
    const hex = Number(data.accentColor)
      .toString(16)
      .padStart(6, '0')

    accentStyle = {
      '--discord-accent': `#${hex}`,
    }
  }

  if (profile.loading) {
    return (
      <div className="discord-contact-card">
        <div className="discord-card-loading">
          Loading Discord profile...
        </div>
      </div>
    )
  }

  if (profile.error || !data) {
    return (
      <div className="discord-contact-card">
        <div className="discord-card-loading">
          Discord profile unavailable
        </div>
      </div>
    )
  }

  return (
    <div
      className="discord-contact-card"
      style={accentStyle}
    >
      <div
        className="discord-contact-banner"
        style={
          data.bannerUrl
            ? {
                backgroundImage:
                  `url("${data.bannerUrl}")`,
              }
            : undefined
        }
      />

      <div className="discord-contact-body">
        <img
          src={data.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
          alt={`${data.displayName || data.username} Discord avatar`}
          className="discord-contact-avatar"
        />

        <div className="discord-contact-copy">
          <span className="discord-contact-label">
            DISCORD
          </span>

          <strong>
            {data.displayName || data.username}
          </strong>

          <span className="discord-contact-username">
            @{data.username}
          </span>
        </div>
      </div>
    </div>
  )
}

function EmailContactCard() {
  return (
    <div className="email-contact-card">
      <img
        src={emailPfp}
        alt=""
        className="email-contact-avatar"
      />

      <div className="email-contact-copy">
        <span className="email-contact-label">
          EMAIL
        </span>

        <strong>Ferretusz</strong>

        <span className="email-contact-address">
          Ferretusz@gmail.com
        </span>
      </div>
    </div>
  )
}

function ProfileCard() {
  return (
    <section className="name-card">
      <div className="name-card-top">
        <img
          src="https://github.com/Tetousz.png"
          alt="Ferretusz GitHub profile"
          className="github-avatar"
        />

        <div className="name-copy">
          <span className="card-label">
            名 / NAME
          </span>

          <h1>Ferretusz</h1>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            @Tetousz ↗
          </a>
        </div>

        <div className="mini-seal">匈</div>
      </div>

      <div className="bio-row">
        <span className="card-label">
          简介 / BIO
        </span>

        <p>Hello! Im Ferretusz.</p>
      </div>

      <div className="activity">
        <div className="activity-heading">
          <span>GITHUB ACTIVITY</span>
          <span>贡献</span>
        </div>

        <ActivityGrid />
      </div>
    </section>
  )
}

function ActivityGrid() {
  const [activity, setActivity] = useState({
    loading: true,
    error: false,
    total: 0,
    days: [],
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadActivity() {
      try {
        const response = await fetch(
          GITHUB_CONTRIBUTIONS_URL,
          {
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(
            `Contribution request failed: ${response.status}`
          )
        }

        const data = await response.json()

        if (!Array.isArray(data.days)) {
          throw new Error(
            'Contribution data is missing days'
          )
        }

        setActivity({
          loading: false,
          error: false,
          total: Number(data.total) || 0,
          days: data.days,
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        console.error(
          'Could not load GitHub contributions:',
          error
        )

        setActivity({
          loading: false,
          error: true,
          total: 0,
          days: [],
        })
      }
    }

    loadActivity()

    return () => {
      controller.abort()
    }
  }, [])

  function getLevel(level) {
    switch (level) {
      case 'FIRST_QUARTILE':
        return 1

      case 'SECOND_QUARTILE':
        return 2

      case 'THIRD_QUARTILE':
        return 3

      case 'FOURTH_QUARTILE':
        return 4

      default:
        return 0
    }
  }

  if (activity.loading) {
    return (
      <div className="activity-wrap">
        <div className="activity-loading">
          Loading GitHub activity...
        </div>
      </div>
    )
  }

  if (activity.error) {
    return (
      <div className="activity-wrap">
        <div className="activity-error">
          GitHub activity unavailable
        </div>
      </div>
    )
  }

  return (
    <div className="activity-wrap">
      <div
        className="activity-grid"
        aria-label={`${activity.total} GitHub contributions in the last year`}
      >
        {activity.days.map((day) => (
          <i
            key={day.date}
            className={`activity-cell level-${getLevel(
              day.level
            )}`}
            title={`${day.date}: ${day.count} ${
              day.count === 1
                ? 'contribution'
                : 'contributions'
            }`}
          />
        ))}
      </div>

      <div className="activity-footer">
        <small>
          {activity.total}{' '}
          {activity.total === 1
            ? 'contribution'
            : 'contributions'}{' '}
          in the last year
        </small>

        <span className="activity-live">
          LIVE
        </span>
      </div>
    </div>
  )
}

function MusicPlayer() {
  const mountRef = useRef(null)
  const playerRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let disposed = false

    function mountPlayer() {
      if (
        disposed ||
        !window.YT?.Player ||
        !mountRef.current ||
        playerRef.current
      ) {
        return
      }

      playerRef.current = new window.YT.Player(
        mountRef.current,
        {
          videoId: VIDEO_ID,
          width: 1,
          height: 1,
          playerVars: {
            controls: 0,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (!disposed) {
                setReady(true)
              }
            },

            onStateChange: (event) => {
              if (!window.YT) return

              setPlaying(
                event.data ===
                  window.YT.PlayerState.PLAYING
              )
            },
          },
        }
      )
    }

    if (window.YT?.Player) {
      mountPlayer()
    } else {
      const oldCallback =
        window.onYouTubeIframeAPIReady

      window.onYouTubeIframeAPIReady = () => {
        if (typeof oldCallback === 'function') {
          oldCallback()
        }

        mountPlayer()
      }

      if (
        !document.querySelector(
          'script[data-ferretusz-youtube]'
        )
      ) {
        const script =
          document.createElement('script')

        script.src =
          'https://www.youtube.com/iframe_api'

        script.async = true
        script.dataset.ferretuszYoutube = 'true'

        document.head.appendChild(script)
      }
    }

    return () => {
      disposed = true
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [])

  function seek(seconds) {
    if (!ready || !playerRef.current) return

    const now =
      playerRef.current.getCurrentTime() || 0

    const duration =
      playerRef.current.getDuration() || 0

    playerRef.current.seekTo(
      Math.max(
        0,
        duration
          ? Math.min(now + seconds, duration)
          : now + seconds
      ),
      true
    )
  }

  function toggle() {
    if (!ready || !playerRef.current) return

    if (
      playerRef.current.getPlayerState() ===
      window.YT.PlayerState.PLAYING
    ) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  return (
    <section className="playing-position">
      <div className="playing-line">
        <span>Playing :</span>

        <button
          type="button"
          className="music-title"
          onClick={toggle}
          disabled={!ready}
          title="Play / pause background music"
        >
          Background music
        </button>
      </div>

      <div className="music-arrows">
        <button
          type="button"
          onClick={() => seek(-10)}
          disabled={!ready}
          aria-label="Back 10 seconds"
        >
          ←
        </button>

        <button
          type="button"
          className="music-play"
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>

        <button
          type="button"
          onClick={() => seek(10)}
          disabled={!ready}
          aria-label="Forward 10 seconds"
        >
          →
        </button>
      </div>

      <div className="youtube-hidden">
        <div ref={mountRef} />
      </div>
    </section>
  )
}

function VisitorLine() {
  const [visitorNumber, setVisitorNumber] =
    useState(null)
  const [totalVisitors, setTotalVisitors] =
    useState(null)
  const [visitorError, setVisitorError] =
    useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadVisitorNumber() {
      try {
        const response = await fetch(
          VISITOR_COUNTER_URL,
          {
            signal: controller.signal,
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          throw new Error(
            `Visitor counter request failed: ${response.status}`
          )
        }

        const data = await response.json()
        const number = Number(data.visitorNumber)
        const total = Number(data.totalVisitors)

        if (
          !Number.isFinite(number) ||
          !Number.isFinite(total)
        ) {
          throw new Error(
            'Visitor counter returned an invalid number'
          )
        }

        setVisitorNumber(number)
        setTotalVisitors(total)
        setVisitorError(false)
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        console.error(
          'Could not load visitor number:',
          error
        )

        setVisitorError(true)
      }
    }

    loadVisitorNumber()

    return () => {
      controller.abort()
    }
  }, [])

  let displayedNumber = '...'
  let displayedTotal = '...'

  if (visitorError) {
    displayedNumber = '?'
    displayedTotal = '?'
  } else {
    if (visitorNumber !== null) {
      displayedNumber =
        visitorNumber.toLocaleString()
    }

    if (totalVisitors !== null) {
      displayedTotal =
        totalVisitors.toLocaleString()
    }
  }

  return (
    <div className="visitor-position">
      <div className="visitor-main-line">
        <span className="visitor-decoration">访</span>

        <span>
          You are number{' '}
          <strong>
            &quot;{displayedNumber}&quot;
          </strong>{' '}
          visitor of this site!
        </span>
      </div>

      <div className="visitor-total">
        Total visitors : {displayedTotal}
      </div>
    </div>
  )
}

function PortfolioComingSoon() {
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem('ferretusz-theme') ||
      'light'
    )
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <main className="portfolio-soon">
      <button
        type="button"
        className="theme-switch"
        onClick={() => {
          const next =
            theme === 'light' ? 'dark' : 'light'

          setTheme(next)

          localStorage.setItem(
            'ferretusz-theme',
            next
          )
        }}
      >
        {theme === 'light' ? '月 DARK' : '日 LIGHT'}
      </button>

      <div className="soon-seal">作</div>

      <span>作品集 / PORTFOLIO</span>

      <h1>Coming soon</h1>

      <p>还在制作 · still being made</p>

      <a href="/">← Home</a>
    </main>
  )
}

export default App
