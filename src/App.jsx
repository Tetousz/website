import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  return (
    <div className="site">
      <nav className="navbar">
        <div className="logo">Ferretusz</div>

        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
          <a href="#skills">Skills</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <p className="eyebrow">Hello, I'm</p>

          <h1>Ferretusz</h1>

          <h2>Computer Science Student</h2>

          <p className="hero-text">
            I build software, experiment with Linux, networking, automation,
            web development.
          </p>

          <div className="hero-buttons">
            <a className="button primary" href="#projects">
              View Projects
            </a>

            <a
              className="button secondary"
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </section>

        <section id="about" className="section">
          <p className="section-label">01 / About</p>

          <h2>About me</h2>

          <p>
            I'm interested in software development, Linux, automation,
            networking and machine learning. I also like to experiment with a lot of other things as well.
          </p>
        </section>

        <section id="projects" className="section">
          <p className="section-label">02 / Projects</p>

          <h2>Projects</h2>

            <div className="project-grid">

            <a
              href="https://github.com/Tetousz/ZenithProxy"
              target="_blank"
              rel="noreferrer"
              className="project-link"
            >
              <article className="project-card">
                <h3>Coming soon...</h3>

                <p>
                  Coming soon...
                </p>

                <div className="tags">

                </div>
              </article>
            </a>



            <a
              href="https://github.com/Tetousz/ZenithProxy"
              target="_blank"
              rel="noreferrer"
              className="project-link"
            >
              <article className="project-card">
                <h3>Coming soon...</h3>

                <p>
                  Coming soon...
                </p>

                <div className="tags">

                </div>
              </article>
            </a>


            <a
              href="https://github.com/Tetousz/ZenithProxy"
              target="_blank"
              rel="noreferrer"
              className="project-link"
            >
              <article className="project-card">
                <h3>Coming soon...</h3>

                <p>
                  Coming soon...
                </p>

                <div className="tags">

                </div>
              </article>
            </a>


          </div>
        </section>

        <section id="skills" className="section">
          <p className="section-label">03 / Skills</p>

          <h2>Technologies</h2>

          <div className="skills">
            <span>Coming soon...</span>
          </div>
        </section>

        <section id="contact" className="section contact">
          <p className="section-label">04 / Contact</p>

          <h2>Contacts</h2>

          <p>
            You can find my projects and experiments on my GitHub.
          </p>

          <a
            className="button primary"
            href="https://github.com/tetousz"
            target="_blank"
            rel="noreferrer"
          >
            Open GitHub
          </a>
          <p>
            You can contact me on Discord.
          </p>
          <a
            className="button primary"
            href="https://discord.com/users/983752650627620944"
            target="_blank"
            rel="noreferrer"
          >
            My Discord account
          </a>
        </section>
      </main>

      <footer>
        <p>Built with React + Vite.</p>
      </footer>
    </div>
  )
}

export default App