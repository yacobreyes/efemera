// ARCHIVED — One-Sitting Reads arcade section removed from homepage
// CSS classes: .ef-reads, .ef-reads-label, .ef-circles, .ef-circle, .ef-circle.active

/*
      {/* ONE-SITTING READS */}
      <section className="ef-reads">
        <div>
          <div className="ef-reads-label">One-Sitting Reads</div>
          <h2>True stories for the time you have.</h2>
        </div>
        <div className="ef-circles">
          {[1, 3, 5, 7].map(m => (
            <button
              key={m}
              className={`ef-circle${activeMin === m ? " active" : ""}`}
              onClick={() => setActiveMin(m)}
            >
              <strong>{m}</strong>
              <span>Min</span>
            </button>
          ))}
        </div>
      </section>

CSS:
        .ef-reads {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 40px;
          align-items: center;
          padding: 52px 7vw;
          background: var(--red);
          color: #fbf6ee;
        }
        .ef-reads-label { font-family: Inter; font-size: 12px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; margin-bottom: 20px; }
        .ef-reads h2 { margin: 0; max-width: 520px; font-size: clamp(30px,4vw,46px); line-height: 1.1; letter-spacing: -.025em; }
        .ef-circles { display: flex; gap: 28px; }
        .ef-circle { width: 92px; height: 92px; border-radius: 50%; border: 2px solid #fbf6ee; background: transparent; color: #fbf6ee; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; cursor: pointer; transition: all .15s; }
        .ef-circle.active { background: #fbf6ee; color: var(--ink); border-color: #fbf6ee; }
        .ef-circle strong { display: flex; align-items: flex-end; font-family: "Cormorant Garamond"; font-weight: 700; font-size: 32px; line-height: 1; height: 32px; }
        .ef-circle span { display: block; font-family: Inter; font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; width: 100%; text-align: center; }
*/
