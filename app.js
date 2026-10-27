// Greek Tavli Online — Core Application Engine (app.js)

  function t() {
    return I18N[myLang] || I18N.en;
  }

  // Switches between the Standalone Landing Hub and the Active Gameplay Board
  function showScreen(screenName) {
    const landing = document.getElementById("landingPage");
    const gameApp = document.getElementById("gameAppLayout");
    if (screenName === "GAME") {
      landing.style.display = "none";
      gameApp.classList.add("active-game");
      gameApp.style.display = window.innerWidth >= 960 ? "grid" : "flex";
      document.body.classList.add("in-game-mode");
      render();
    } else {
      gameApp.classList.remove("active-game");
      gameApp.style.display = "none";
      document.body.classList.remove("in-game-mode");
      landing.style.display = "flex";
      checkPersistentLoginSession();
    }
  }

  window.addEventListener("resize", () => {
    const gameApp = document.getElementById("gameAppLayout");
    if (gameApp && gameApp.classList.contains("active-game")) {
      gameApp.style.display = window.innerWidth >= 960 ? "grid" : "flex";
    }
  });

  function selectTheme(themeId) {
    myTheme = ALL_THEMES.includes(themeId) ? themeId : "classic";
    document.body.setAttribute("data-theme", myTheme);
    localStorage.setItem("tavli_theme", myTheme);
    ALL_THEMES.forEach(id => {
      const el = document.getElementById("themeCard_" + id);
      if (el) el.classList.toggle("active", id === myTheme);
    });
  }

  function selectLangPref(lang) {
    myLang = (lang === "el") ? "el" : "en";
    localStorage.setItem("tavli_lang", myLang);
    const sEN = document.getElementById("setLangEN");
    const sEL = document.getElementById("setLangEL");
    if (sEN) sEN.classList.toggle("active", myLang === "en");
    if (sEL) sEL.classList.toggle("active", myLang === "el");
    applyLanguageToUI();
  }

  function selectAiDifficulty(diff) {
    myAiDifficulty = diff;
    document.getElementById("aiEasy").classList.toggle("active", diff === "EASY");
    document.getElementById("aiMedium").classList.toggle("active", diff === "MEDIUM");
    document.getElementById("aiHard").classList.toggle("active", diff === "HARD");
  }

  function selectStoreDetailsPref(enable) {
    myStoreDetailsPref = enable;
    document.getElementById("optStoreYes").classList.toggle("active", enable);
    document.getElementById("optStoreNo").classList.toggle("active", !enable);
    document.getElementById("playerPinInput").style.display = enable ? "block" : "none";
    document.getElementById("authErrorBox").style.display = "none";
    handleNameInputCheck();
  }

  function selectModalGuestStore(enable) {
    const yesOpt = document.getElementById("modalOptStoreYes");
    const noOpt = document.getElementById("modalOptStoreNo");
    const pinInput = document.getElementById("modalGuestPinInput");
    if (yesOpt && noOpt && pinInput) {
      yesOpt.classList.toggle("active", enable);
      noOpt.classList.toggle("active", !enable);
      pinInput.style.display = enable ? "block" : "none";
    }
  }

  function handleNameInputCheck() {
    const rawName = document.getElementById("playerNameInput").value.trim();
    const hintEl = document.getElementById("pinPromptHint");
    const errBox = document.getElementById("authErrorBox");
    errBox.style.display = "none";
    const tr = t();

    if (!myStoreDetailsPref) {
      hintEl.textContent = tr.guestBadge(rawName || tr.defaultPlayer);
      hintEl.style.color = "#ffecb3";
      return;
    }

    if (!rawName) {
      hintEl.textContent = tr.pinHintDefault;
      hintEl.style.color = "#ffecb3";
      return;
    }

    if (window.TavliDB.userExists(rawName)) {
      hintEl.textContent = tr.pinHintExisting(rawName);
      hintEl.style.color = "#4fc3f7";
    } else {
      hintEl.textContent = tr.pinHintNew(rawName);
      hintEl.style.color = "#81c784";
    }
  }

  function showAuthError(msg) {
    const errBox = document.getElementById("authErrorBox");
    errBox.textContent = msg;
    errBox.style.display = "block";
  }

  function updateAdminButtonVisibility() {
    const isAdmin = isAuthenticatedAccount && window.TavliDB.isAdminName(myPlayerName);
    const btn1 = document.getElementById("btnAdminPanel");
    const btn2 = document.getElementById("btnLandingAdmin");
    if (btn1) btn1.style.display = isAdmin ? "flex" : "none";
    if (btn2) btn2.style.display = isAdmin ? "flex" : "none";
  }

  // Persistent Login Session check & UI update (Item 4 & 5)
  function checkPersistentLoginSession() {
    const savedName = localStorage.getItem("tavli_logged_in_name");
    const savedPinHash = localStorage.getItem("tavli_logged_in_pinhash");
    const tr = t();

    if (savedName && window.TavliDB.userExists(savedName)) {
      const u = window.TavliDB.getUser(savedName);
      if (u && (!savedPinHash || u.pinHash === savedPinHash)) {
        myPlayerName = u.name;
        isAuthenticatedAccount = true;
        document.getElementById("playerNameInput").value = u.name;
        document.getElementById("playerNameInput").disabled = true;
        document.getElementById("playerPinInput").style.display = "none";
        document.getElementById("storeToggleGroup").style.display = "none";
        document.getElementById("btnVerifyIdentity").style.display = "none";
        document.getElementById("btnLogoutIdentity").style.display = "inline-block";

        const hintEl = document.getElementById("pinPromptHint");
        hintEl.textContent = tr.verifiedBadge(u.name);
        hintEl.style.color = "#00e676";
        updateAdminButtonVisibility();
        return;
      }
    }

    document.getElementById("playerNameInput").disabled = false;
    document.getElementById("playerPinInput").style.display = myStoreDetailsPref ? "block" : "none";
    document.getElementById("storeToggleGroup").style.display = "flex";
    document.getElementById("btnVerifyIdentity").style.display = "inline-block";
    document.getElementById("btnLogoutIdentity").style.display = "none";
    updateAdminButtonVisibility();
  }

  async function verifyIdentityOnLanding(showSuccessHint = false) {
    ensureAudio();
    const tr = t();
    const rawName = document.getElementById("playerNameInput").value.trim() || tr.defaultPlayer;
    const rawPin = document.getElementById("playerPinInput").value.trim();

    if (myStoreDetailsPref) {
      const auth = await window.TavliDB.authenticateOrCreateAsync(rawName, rawPin);
      if (!auth.ok) {
        showAuthError(auth.message);
        return false;
      }
      myPlayerName = auth.user.name;
      mySessionPin = rawPin;
      isAuthenticatedAccount = true;
      localStorage.setItem("tavli_store_enabled", "1");
      localStorage.setItem("tavli_logged_in_name", myPlayerName);
      localStorage.setItem("tavli_logged_in_pinhash", auth.user.pinHash);

      if (showSuccessHint) {
        checkPersistentLoginSession();
      }
    } else {
      await window.TavliDB.pullFromServer();
      if (window.TavliDB.userExists(rawName)) {
        showAuthError(tr.errRegisteredNeedsPin);
        return false;
      }
      myPlayerName = rawName;
      mySessionPin = "";
      isAuthenticatedAccount = false;
      localStorage.setItem("tavli_store_enabled", "0");
      localStorage.removeItem("tavli_logged_in_name");
      localStorage.removeItem("tavli_logged_in_pinhash");

      if (showSuccessHint) {
        const hintEl = document.getElementById("pinPromptHint");
        hintEl.textContent = tr.guestBadge(myPlayerName);
        hintEl.style.color = "#00e676";
      }
    }

    localStorage.setItem("tavli_player_name", myPlayerName);
    document.getElementById("authErrorBox").style.display = "none";
    updateAdminButtonVisibility();
    updateHeaderLabels();
    return true;
  }

  function logoutIdentity() {
    isAuthenticatedAccount = false;
    mySessionPin = "";
    localStorage.removeItem("tavli_logged_in_name");
    localStorage.removeItem("tavli_logged_in_pinhash");
    checkPersistentLoginSession();
    handleNameInputCheck();
  }

  // Opens configuration pop-up; handles Item 6 (Invite Link unlogged guest check)
  async function openPlaySetupModal(role) {
    const tr = t();
    const guestAuthBox = document.getElementById("inviteGuestAuthSection");
    const isJoinViaLink = (role === "JOIN" && pendingRoomFromUrl && !isAuthenticatedAccount);

    if (isJoinViaLink) {
      guestAuthBox.style.display = "block";
    } else {
      guestAuthBox.style.display = "none";
      const ok = await verifyIdentityOnLanding(false);
      if (!ok && !myStoreDetailsPref) {
        // Allow guest play if guest mode selected
      } else if (!ok) {
        return;
      }
    }

    modalRole = role;
    if (role === "HOST") {
      document.getElementById("playConfigTitle").textContent = tr.titleHostModal;
      document.getElementById("modalSubmitBtn").textContent = tr.btnStartGame;
    } else if (role === "JOIN") {
      document.getElementById("playConfigTitle").textContent = tr.titleJoinModal;
      document.getElementById("modalSubmitBtn").textContent = tr.btnJoinGame;
    } else {
      document.getElementById("playConfigTitle").textContent = tr.titleAiModal;
      document.getElementById("modalSubmitBtn").textContent = tr.btnStartAi;
    }

    document.getElementById("hostOnlySettings").style.display = (role === "HOST" || role === "AI") ? "block" : "none";
    document.getElementById("joinOnlySettings").style.display = role === "JOIN" ? "block" : "none";
    document.getElementById("aiOnlySettings").style.display = role === "AI" ? "block" : "none";

    renderColorPicker();
    renderTargetScorePicker();
    document.getElementById("playConfigModal").style.display = "flex";
  }

  function closePlayConfigModal() {
    document.getElementById("playConfigModal").style.display = "none";
  }

  async function confirmStartSelectedMode() {
    ensureAudio();
    const tr = t();

    // Item 6: Handle invite link guest name/PIN prompt if unlogged
    const guestAuthBox = document.getElementById("inviteGuestAuthSection");
    if (guestAuthBox && guestAuthBox.style.display === "block") {
      const gName = document.getElementById("modalGuestNameInput").value.trim() || tr.defaultPlayer;
      const isStore = document.getElementById("modalOptStoreYes").classList.contains("active");
      const gPin = document.getElementById("modalGuestPinInput").value.trim();

      if (isStore) {
        const auth = await window.TavliDB.authenticateOrCreateAsync(gName, gPin);
        if (!auth.ok) {
          const errEl = document.getElementById("modalAuthErrorBox");
          errEl.textContent = auth.message;
          errEl.style.display = "block";
          return;
        }
        myPlayerName = auth.user.name;
        isAuthenticatedAccount = true;
        localStorage.setItem("tavli_logged_in_name", myPlayerName);
        localStorage.setItem("tavli_logged_in_pinhash", auth.user.pinHash);
      } else {
        myPlayerName = gName;
        isAuthenticatedAccount = false;
      }
      localStorage.setItem("tavli_player_name", myPlayerName);
    }

    localStorage.setItem("tavli_player_color", myChosenColor);

    if (modalRole === "JOIN") {
      const joinCode = (pendingRoomFromUrl || document.getElementById("modalRoomInput").value || "").trim().toUpperCase();
      if (joinCode.length !== 6) {
        alert(tr.enter6CodeAlert);
        return;
      }
      pendingRoomFromUrl = null;
      closePlayConfigModal();
      showScreen("GAME");
      joinRoomWithCode(joinCode);
      return;
    }

    localStorage.setItem("tavli_end_turn_pref", myEndTurnPref ? "1" : "0");
    localStorage.setItem("tavli_auto_roll_pref", myAutoRollPref ? "1" : "0");
    localStorage.setItem("tavli_target_score", String(myTargetScorePref));
    localStorage.setItem("tavli_game_mode", myGameModePref);

    closePlayConfigModal();
    showScreen("GAME");

    if (modalRole === "HOST") {
      hostRoom();
    } else if (modalRole === "AI") {
      isAiMatch = true;
      myRole = "W";
      playerNames.W = myPlayerName;
      playerNames.B = `AI (${myAiDifficulty})`;
      state.colors.W = myChosenColor;
      state.colors.B = getDistinctFallbackColor(state.colors.W);
      state.requireEndTurn = myEndTurnPref;
      state.autoRoll = myAutoRollPref;
      state.targetScore = myTargetScorePref;
      state.variantSequence = getSequenceForMode(myGameModePref);
      state.variantIdx = 0;
      state.scoreW = 0;
      state.scoreB = 0;
      resetSetTracking();
      document.getElementById("shareBtn").style.display = "none";
      document.getElementById("netStatus").textContent = tr.netAiMode(myAiDifficulty);
      initGame("ROLL_OFF");
    }
  }

  function applyLanguageToUI() {
    const tr = t();
    document.documentElement.lang = myLang;
    document.getElementById("landingMainTitle").textContent = tr.landingMainTitle;
    document.getElementById("landingSubTitle").textContent = tr.landingSubTitle;
    document.getElementById("lblIdentityHeader").textContent = tr.lblIdentityHeader;
    document.getElementById("btnVerifyIdentity").textContent = tr.btnVerifyIdentity;
    document.getElementById("btnLogoutIdentity").textContent = "Logout";
    document.getElementById("hubBtnHost").textContent = tr.hubBtnHost;
    document.getElementById("hubBtnJoin").textContent = tr.hubBtnJoin;
    document.getElementById("hubBtnAi").textContent = tr.hubBtnAi;
    document.getElementById("hubBtnProfile").textContent = tr.btnProfile;
    document.getElementById("hubBtnLeaderboard").textContent = tr.btnLeaderboard;
    document.getElementById("hubBtnSettings").textContent = tr.btnSettings;
    document.getElementById("lblLandingAdmin").textContent = tr.btnAdmin;
    document.getElementById("hubArtCaption").textContent = tr.hubArtCaption;
    document.getElementById("btnConfigBack").textContent = tr.btnBack;
    document.getElementById("menuReturnBtn").textContent = tr.menuReturnBtn;

    document.getElementById("playerNameInput").placeholder = tr.namePlaceholder;
    document.getElementById("optStoreNo").textContent = tr.optGuestNoPin;
    document.getElementById("optStoreYes").textContent = tr.optEnableStore;
    document.getElementById("playerPinInput").placeholder = tr.pinPlaceholder;
    document.getElementById("lblCheckerColor").textContent = tr.lblCheckerColor;
    document.getElementById("lblAiDiff").textContent = tr.lblAiDiff;
    document.getElementById("aiEasy").textContent = tr.aiEasy;
    document.getElementById("aiMedium").textContent = tr.aiMedium;
    document.getElementById("aiHard").textContent = tr.aiHard;
    document.getElementById("lblRoomCode").textContent = tr.lblRoomCode;
    document.getElementById("modalRoomInput").placeholder = tr.roomPlaceholder;
    document.getElementById("lblGameSel").textContent = tr.lblGameSel;
    document.getElementById("modeFull").textContent = tr.modeFull;
    document.getElementById("modePortes").textContent = tr.modePortes;
    document.getElementById("modePlakoto").textContent = tr.modePlakoto;
    document.getElementById("modeFevga").textContent = tr.modeFevga;
    document.getElementById("lblNumGames").textContent = tr.lblNumGames;
    document.getElementById("lblEndTurn").textContent = tr.lblEndTurn;
    document.getElementById("optEndTurnYes").textContent = tr.optOn;
    document.getElementById("optEndTurnNo").textContent = tr.optOffAutoEnd;
    document.getElementById("lblAutoRoll").textContent = tr.lblAutoRoll;
    document.getElementById("optAutoRollNo").textContent = tr.optOffManual;
    document.getElementById("optAutoRollYes").textContent = tr.optOnAutoRoll;

    if (isAiMatch) {
      document.getElementById("netStatus").textContent = tr.netAiMode(myAiDifficulty);
    } else if (!activeRoomCode) {
      document.getElementById("netStatus").textContent = tr.netDefault;
    }
    document.getElementById("shareBtn").textContent = tr.shareBtn;
    document.getElementById("muteBtn").textContent = soundEnabled ? tr.soundOn : tr.soundOff;

    document.getElementById("lblBar").textContent = tr.bar;
    document.getElementById("lblOff").textContent = tr.off;
    document.getElementById("rollBtn").textContent = tr.rollBtn;
    document.getElementById("undoBtn").textContent = tr.undoBtn;
    document.getElementById("endTurnBtn").textContent = tr.endTurnBtn;
    document.getElementById("resignBtn").textContent = tr.resignBtn;

    document.getElementById("resignModalTitle").textContent = tr.resignTitle;
    document.getElementById("resignModalDesc").textContent = tr.resignDesc;
    document.getElementById("btnOfferMoni").textContent = tr.offerMoni;
    document.getElementById("btnOfferDiplo").textContent = tr.offerDiplo;
    document.getElementById("btnCancelResign").textContent = tr.cancelBtn;
    document.getElementById("resignRespTitle").textContent = tr.resignRespTitle;
    document.getElementById("btnAcceptResign").textContent = tr.acceptResign;
    document.getElementById("btnDeclineResign").textContent = tr.declineResign;

    document.getElementById("lblBtnProfile").textContent = tr.btnProfile;
    document.getElementById("lblBtnLeaderboard").textContent = tr.btnLeaderboard;
    document.getElementById("lblBtnSettings").textContent = tr.btnSettings;
    document.getElementById("lblBtnAdmin").textContent = tr.btnAdmin;
    document.getElementById("profModalTitle").textContent = tr.profTitle;
    document.getElementById("lbModalTitle").textContent = tr.lbTitle;
    document.getElementById("settingsModalTitle").textContent = tr.settingsTitle;
    document.getElementById("lblSettingsTheme").textContent = tr.lblSettingsTheme;
    document.getElementById("thNameClassic").textContent = tr.thClassic;
    document.getElementById("thNameBlue").textContent = tr.thBlue;
    document.getElementById("thNameGreen").textContent = tr.thGreen;
    document.getElementById("thNameWhite").textContent = tr.thWhite;
    document.getElementById("thNameAmethyst").textContent = tr.thAmethyst;
    document.getElementById("thNameTerracotta").textContent = tr.thTerracotta;
    document.getElementById("thNameMidnight").textContent = tr.thMidnight;
    document.getElementById("thNameSakura").textContent = tr.thSakura;
    document.getElementById("profCloseBtn").textContent = tr.closeBtn;
    document.getElementById("lbCloseBtn").textContent = tr.closeBtn;
    document.getElementById("settingsCloseBtn").textContent = tr.closeBtn;

    const wSender = document.getElementById("welcomeSender");
    const wMsg = document.getElementById("welcomeMsg");
    if (wSender) wSender.textContent = `${tr.sysLabel}:`;
    if (wMsg) wMsg.textContent = tr.welcomeMsg;

    document.getElementById("chatInput").placeholder = tr.chatPlaceholder;
    document.getElementById("sendChatBtn").textContent = tr.sendBtn;

    handleNameInputCheck();
    renderColorPicker();
    updateHeaderLabels();
    render();
  }

  function renderColorPicker() {
    const grid = document.getElementById("colorGrid");
    grid.innerHTML = "";
    const tr = t();
    CHECKER_COLORS.forEach(c => {
      const opt = document.createElement("div");
      opt.className = "color-option" + (c.id === myChosenColor ? " active" : "");
      opt.onclick = () => {
        myChosenColor = c.id;
        renderColorPicker();
      };
      const swatch = document.createElement("div");
      swatch.className = `swatch-circle clr-${c.id}`;
      const lbl = document.createElement("span");
      lbl.textContent = tr.colors[c.id] || c.id;
      opt.appendChild(swatch);
      opt.appendChild(lbl);
      grid.appendChild(opt);
    });
  }

  function renderTargetScorePicker() {
    const row = document.getElementById("targetScoreRow");
    row.innerHTML = "";
    ALLOWED_TARGETS.forEach(n => {
      const btn = document.createElement("div");
      btn.className = "num-opt" + (n === myTargetScorePref ? " active" : "");
      btn.textContent = n;
      btn.onclick = () => {
        myTargetScorePref = n;
        renderTargetScorePicker();
      };
      row.appendChild(btn);
    });
  }

  function selectGameMode(mode) {
    myGameModePref = mode;
    document.getElementById("modeFull").classList.toggle("active", mode === "FULL");
    document.getElementById("modePortes").classList.toggle("active", mode === "PORTES");
    document.getElementById("modePlakoto").classList.toggle("active", mode === "PLAKOTO");
    document.getElementById("modeFevga").classList.toggle("active", mode === "FEVGA");
  }

  function selectEndTurnPref(useBtn) {
    myEndTurnPref = useBtn;
    document.getElementById("optEndTurnYes").classList.toggle("active", useBtn);
    document.getElementById("optEndTurnNo").classList.toggle("active", !useBtn);
  }

  function selectAutoRollPref(autoRoll) {
    myAutoRollPref = autoRoll;
    document.getElementById("optAutoRollYes").classList.toggle("active", autoRoll);
    document.getElementById("optAutoRollNo").classList.toggle("active", !autoRoll);
  }

  function getDistinctFallbackColor(takenId) {
    const preferred = ["black", "white", "red", "blue", "yellow", "green", "purple", "brown"];
    return preferred.find(id => id !== takenId) || "black";
  }

  function getColorMeta(colorId) {
    const base = CHECKER_COLORS.find(c => c.id === colorId) || CHECKER_COLORS[0];
    return {
      id: base.id,
      chatHex: base.chatHex,
      label: t().colors[base.id] || base.id
    };
  }

  function getSequenceForMode(mode) {
    if (mode === "PORTES") return ["PORTES"];
    if (mode === "PLAKOTO") return ["PLAKOTO"];
    if (mode === "FEVGA") return ["FEVGA"];
    return ["PORTES", "PLAKOTO", "FEVGA"];
  }

  async function openProfileModal() {
    await verifyIdentityOnLanding(false);
    renderProfileModalContent();
    document.getElementById("profileModal").style.display = "flex";
    await window.TavliDB.pullFromServer();
    renderProfileModalContent();
  }
  function closeProfileModal() {
    document.getElementById("profileModal").style.display = "none";
  }

  async function openSettingsModal() {
    await verifyIdentityOnLanding(false);
    renderSettingsAccountSection();
    document.getElementById("settingsModal").style.display = "flex";
  }
  function closeSettingsModal() {
    document.getElementById("settingsModal").style.display = "none";
  }

  function renderProfileModalContent() {
    const container = document.getElementById("profileContent");
    const tr = t();
    const user = window.TavliDB.getUser(myPlayerName);

    if (!user || !isAuthenticatedAccount) {
      container.innerHTML = `
        <div class="profile-name-header">👤 ${escapeHtml(myPlayerName)}</div>
        <p style="font-size:0.85rem; color:#ffecb3; text-align:center; padding:12px;">${tr.profGuestMsg}</p>
      `;
      return;
    }

    const s = user.stats || {};
    const setsW = s.setsWon || 0;
    const setsL = s.setsLost || 0;
    const setsTot = setsW + setsL;

    const gamesW = s.gamesWon || 0;
    const gamesL = s.gamesLost || 0;
    const gamesTot = gamesW + gamesL;

    const rankInfo = window.TavliDB.getPlayerRank(myPlayerName);
    const rankStr = rankInfo ? `#${rankInfo.rank} / ${rankInfo.total}` : "-";

    const calcRate = (won, played) => played > 0 ? `${Math.round((won / played) * 100)}% (${won}/${played})` : `0% (0/0)`;
    const vPortes = (s.variants && s.variants.PORTES) || { played: 0, won: 0 };
    const vPlakoto = (s.variants && s.variants.PLAKOTO) || { played: 0, won: 0 };
    const vFevga = (s.variants && s.variants.FEVGA) || { played: 0, won: 0 };

    const topOpps = window.TavliDB.getTopOpponents(myPlayerName, 3);
    let oppRowsHtml = "";
    if (topOpps.length === 0) {
      oppRowsHtml = `<tr><td colspan="3" style="text-align:center; color:#90a4ae;">${tr.profNoOpp}</td></tr>`;
    } else {
      topOpps.forEach(o => {
        oppRowsHtml += `
          <tr>
            <td><strong>${escapeHtml(o.displayName)}</strong></td>
            <td><span style="color:#00e676;font-weight:bold;">${o.gamesWon}W</span> / <span style="color:#ff8a80;font-weight:bold;">${o.gamesLost}L</span> (${o.gamesPlayed})</td>
            <td><span style="color:#00e676;font-weight:bold;">${o.setsWon}W</span> / <span style="color:#ff8a80;font-weight:bold;">${o.setsLost}L</span> (${o.setsPlayed})</td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="profile-name-header">👤 ${escapeHtml(user.name)}</div>

      <div class="stat-grid">
        <div class="stat-box">
          <div class="val">${rankStr}</div>
          <div class="lbl">${tr.profRank}</div>
        </div>
        <div class="stat-box">
          <div class="val" style="font-size:0.98rem;"><span style="color:#00e676;">${setsW}W</span> / <span style="color:#ff8a80;">${setsL}L</span> (${setsTot})</div>
          <div class="lbl">${tr.profSets}</div>
        </div>
        <div class="stat-box">
          <div class="val" style="font-size:0.98rem;"><span style="color:#00e676;">${gamesW}W</span> / <span style="color:#ff8a80;">${gamesL}L</span> (${gamesTot})</div>
          <div class="lbl">${tr.profGames}</div>
        </div>
      </div>

      <div class="sub-heading">${tr.profVariantHeading}</div>
      <div class="stat-grid">
        <div class="stat-box">
          <div class="val" style="font-size:0.95rem;">${calcRate(vPortes.won, vPortes.played)}</div>
          <div class="lbl">${tr.variants.PORTES}</div>
        </div>
        <div class="stat-box">
          <div class="val" style="font-size:0.95rem;">${calcRate(vPlakoto.won, vPlakoto.played)}</div>
          <div class="lbl">${tr.variants.PLAKOTO}</div>
        </div>
        <div class="stat-box">
          <div class="val" style="font-size:0.95rem;">${calcRate(vFevga.won, vFevga.played)}</div>
          <div class="lbl">${tr.variants.FEVGA}</div>
        </div>
      </div>

      <div class="sub-heading">${tr.profTopOppHeading}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${tr.colOpponent}</th>
            <th>${tr.colOppGames}</th>
            <th>${tr.colOppSetsWL}</th>
          </tr>
        </thead>
        <tbody>${oppRowsHtml}</tbody>
      </table>
    `;
  }

  function renderSettingsAccountSection(feedbackMsg = "") {
    const container = document.getElementById("settingsAccountSection");
    if (!container) return;
    const tr = t();
    const user = window.TavliDB.getUser(myPlayerName);

    if (!user || !isAuthenticatedAccount) {
      container.innerHTML = `
        <div class="sub-heading">${tr.profEditHeading}</div>
        <p style="font-size:0.78rem; color:#ffecb3; padding:6px 0;">${tr.profGuestMsg}</p>
      `;
      return;
    }

    container.innerHTML = `
      <div class="sub-heading">${tr.profEditHeading}</div>
      <div class="edit-row">
        <input type="text" id="profEditName" value="${escapeHtml(user.name)}" maxlength="16" placeholder="Name" />
        <input type="password" id="profEditPin" value="" maxlength="4" inputmode="numeric" placeholder="${tr.profNewPinPh}" />
        <button class="btn-sm" style="padding:9px 14px;" onclick="saveProfileEdits()">${tr.profSaveBtn}</button>
      </div>
      ${feedbackMsg ? `<div style="margin-top:6px; font-size:0.78rem; color:#00e676; font-weight:bold;">${escapeHtml(feedbackMsg)}</div>` : ""}
    `;
  }

  async function saveProfileEdits() {
    const newName = document.getElementById("profEditName").value.trim();
    const newPin = document.getElementById("profEditPin").value.trim();
    const res = await window.TavliDB.updateCredentialsAsync(myPlayerName, newName, newPin, mySessionPin);
    if (!res.ok) {
      alert(res.message);
      return;
    }

    if (newPin) mySessionPin = newPin;
    const oldName = myPlayerName;
    myPlayerName = res.user.name;
    document.getElementById("playerNameInput").value = myPlayerName;
    localStorage.setItem("tavli_player_name", myPlayerName);
    localStorage.setItem("tavli_logged_in_name", myPlayerName);
    localStorage.setItem("tavli_logged_in_pinhash", res.user.pinHash);

    if (myRole === "B") {
      playerNames.B = myPlayerName;
    } else {
      playerNames.W = myPlayerName;
      if (playerNames.B === oldName) playerNames.B = myPlayerName;
    }
    updateAdminButtonVisibility();
    updateHeaderLabels();
    render();
    syncDatabaseWithPeer();
    renderSettingsAccountSection(t().profSavedMsg);
  }

  async function openLeaderboardModal() {
    const tr = t();
    lbCurrentPage = 1;
    document.getElementById("lbSyncStatus").textContent = tr.lbSyncing;
    renderLeaderboardModalContent();
    document.getElementById("leaderboardModal").style.display = "flex";

    await window.TavliDB.pullFromServer();
    document.getElementById("lbSyncStatus").textContent = tr.lbSynced;
    renderLeaderboardModalContent();
  }
  function closeLeaderboardModal() {
    document.getElementById("leaderboardModal").style.display = "none";
  }

  function changeLeaderboardPage(delta) {
    lbCurrentPage += delta;
    renderLeaderboardModalContent();
  }

  function renderLeaderboardModalContent() {
    const container = document.getElementById("leaderboardContent");
    const tr = t();
    const list = window.TavliDB.getLeaderboard();

    if (list.length === 0) {
      container.innerHTML = `<p style="font-size:0.85rem; color:#90a4ae; text-align:center; padding:12px;">${tr.lbEmpty}</p>`;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    if (lbCurrentPage > totalPages) lbCurrentPage = totalPages;
    if (lbCurrentPage < 1) lbCurrentPage = 1;

    const startIdx = (lbCurrentPage - 1) * PAGE_SIZE;
    const pageItems = list.slice(startIdx, startIdx + PAGE_SIZE);

    let rowsHtml = "";
    pageItems.forEach(item => {
      const isMe = window.TavliDB.normalizeKey(item.name) === window.TavliDB.normalizeKey(myPlayerName);
      const rowStyle = isMe ? "background:rgba(255,179,0,0.16); font-weight:bold;" : "";
      rowsHtml += `
        <tr style="${rowStyle}">
          <td>#${item.rank}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.setsWon} / ${item.setsPlayed}</td>
          <td>${item.gamesWon} / ${item.gamesPlayed}</td>
          <td style="color:var(--accent); font-weight:bold;">${Math.round(item.overallWinRate)}%</td>
        </tr>
      `;
    });

    const pagerHtml = totalPages > 1 ? `
      <div class="pagination-bar">
        <button onclick="changeLeaderboardPage(-1)" ${lbCurrentPage <= 1 ? "disabled" : ""}>${tr.prevPage}</button>
        <span>${tr.pageOf(lbCurrentPage, totalPages)}</span>
        <button onclick="changeLeaderboardPage(1)" ${lbCurrentPage >= totalPages ? "disabled" : ""}>${tr.nextPage}</button>
      </div>
    ` : "";

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>${tr.colRank}</th>
            <th>${tr.colPlayer}</th>
            <th>${tr.colSets}</th>
            <th>${tr.colGames}</th>
            <th>${tr.colWinRate}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${pagerHtml}
    `;
  }

  // --- Sotiris Admin Database Manager ---
  async function openAdminModal() {
    if (!isAuthenticatedAccount || !window.TavliDB.isAdminName(myPlayerName)) return;
    adminCurrentPage = 1;
    document.getElementById("adminOpponentsEditor").style.display = "none";
    document.getElementById("adminFeedback").textContent = "Syncing with server...";
    document.getElementById("adminCloudUrlInput").value = window.TavliDB.getCloudUrl();
    renderAdminTable();
    document.getElementById("adminModal").style.display = "flex";
    await window.TavliDB.pullFromServer();
    document.getElementById("adminFeedback").textContent = "🌐 Server database synced (PINs SHA-256 hashed).";
    renderAdminTable();
  }
  function closeAdminModal() {
    document.getElementById("adminModal").style.display = "none";
  }

  function changeAdminPage(delta) {
    adminCurrentPage += delta;
    renderAdminTable();
  }

  async function adminSaveCloudUrl() {
    const newUrl = document.getElementById("adminCloudUrlInput").value.trim();
    const fb = document.getElementById("adminFeedback");
    fb.style.color = "#ffb300";
    fb.textContent = "Connecting to server endpoint...";
    const ok = await window.TavliDB.setCloudUrl(newUrl);
    await window.TavliDB.pushToServer();
    fb.style.color = "#00e676";
    fb.textContent = ok
      ? "Connected & synced with Cloud Server URL!"
      : "Saved URL and pushed current database to endpoint!";
    renderAdminTable();
  }

  function renderAdminTable() {
    const container = document.getElementById("adminTableContainer");
    const users = window.TavliDB.getAllUsers();
    const tr = t();
    if (users.length === 0) {
      container.innerHTML = `<p style="padding:10px; color:#bcaaa4;">No users in database.</p>`;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
    if (adminCurrentPage > totalPages) adminCurrentPage = totalPages;
    if (adminCurrentPage < 1) adminCurrentPage = 1;

    const startIdx = (adminCurrentPage - 1) * PAGE_SIZE;
    const pageUsers = users.slice(startIdx, startIdx + PAGE_SIZE);

    let rows = "";
    pageUsers.forEach((u, pageOffset) => {
      const idx = startIdx + pageOffset;
      const k = window.TavliDB.normalizeKey(u.name);
      const s = u.stats || {};
      const vP = (s.variants && s.variants.PORTES) || { won: 0, played: 0 };
      const vPl = (s.variants && s.variants.PLAKOTO) || { won: 0, played: 0 };
      const vF = (s.variants && s.variants.FEVGA) || { won: 0, played: 0 };

      rows += `
        <tr>
          <td><input type="text" class="admin-input" id="adm_name_${idx}" value="${escapeHtml(u.name)}" /></td>
          <td><input type="password" class="admin-input" id="adm_pin_${idx}" value="" placeholder="🔒 Hashed" maxlength="4" title="Protected by SHA-256. Enter 4 digits to reset PIN, or leave blank." /></td>
          <td><input type="number" class="admin-input" id="adm_sw_${idx}" value="${s.setsWon || 0}" min="0" /></td>
          <td><input type="number" class="admin-input" id="adm_sl_${idx}" value="${s.setsLost || 0}" min="0" /></td>
          <td><input type="number" class="admin-input" id="adm_gw_${idx}" value="${s.gamesWon || 0}" min="0" /></td>
          <td><input type="number" class="admin-input" id="adm_gl_${idx}" value="${s.gamesLost || 0}" min="0" /></td>
          <td>
            <div style="display:flex; gap:2px; align-items:center;">
              <input type="number" class="admin-input" id="adm_pw_${idx}" value="${vP.won || 0}" min="0" title="Portes Won" />/
              <input type="number" class="admin-input" id="adm_pp_${idx}" value="${vP.played || 0}" min="0" title="Portes Played" />
            </div>
          </td>
          <td>
            <div style="display:flex; gap:2px; align-items:center;">
              <input type="number" class="admin-input" id="adm_plw_${idx}" value="${vPl.won || 0}" min="0" title="Plakoto Won" />/
              <input type="number" class="admin-input" id="adm_plp_${idx}" value="${vPl.played || 0}" min="0" title="Plakoto Played" />
            </div>
          </td>
          <td>
            <div style="display:flex; gap:2px; align-items:center;">
              <input type="number" class="admin-input" id="adm_fw_${idx}" value="${vF.won || 0}" min="0" title="Fevga Won" />/
              <input type="number" class="admin-input" id="adm_fp_${idx}" value="${vF.played || 0}" min="0" title="Fevga Played" />
            </div>
          </td>
          <td style="white-space:nowrap;">
            <button class="btn-sm" style="padding:4px 6px; margin-right:2px;" onclick="adminSaveRow('${escapeHtml(k)}', ${idx})">Save</button>
            <button class="btn-sm" style="padding:4px 6px; background:#4fc3f7; margin-right:2px;" onclick="adminOpenOpponentsEditor('${escapeHtml(k)}')">Opponents</button>
            <button class="btn-sm" style="padding:4px 6px; background:#e53935; color:#fff;" onclick="adminDeleteRow('${escapeHtml(k)}')">Del</button>
          </td>
        </tr>
      `;
    });

    const pagerHtml = totalPages > 1 ? `
      <div class="pagination-bar">
        <button onclick="changeAdminPage(-1)" ${adminCurrentPage <= 1 ? "disabled" : ""}>${tr.prevPage}</button>
        <span>${tr.pageOf(adminCurrentPage, totalPages)}</span>
        <button onclick="changeAdminPage(1)" ${adminCurrentPage >= totalPages ? "disabled" : ""}>${tr.nextPage}</button>
      </div>
    ` : "";

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th style="width:78px;">New PIN</th>
            <th>Sets W</th>
            <th>Sets L</th>
            <th>Games W</th>
            <th>Games L</th>
            <th>Portes W/P</th>
            <th>Plakoto W/P</th>
            <th>Fevga W/P</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${pagerHtml}
    `;
  }

  function adminOpenOpponentsEditor(userKey) {
    const box = document.getElementById("adminOpponentsEditor");
    const u = window.TavliDB.getUser(userKey);
    if (!u) return;
    const opps = (u.stats && u.stats.opponents) ? Object.entries(u.stats.opponents) : [];

    let rowsHtml = "";
    if (opps.length === 0) {
      rowsHtml = `<tr><td colspan="6" style="text-align:center; color:#90a4ae;">No opponents recorded for ${escapeHtml(u.name)}.</td></tr>`;
    } else {
      opps.forEach(([oppKey, o], i) => {
        rowsHtml += `
          <tr>
            <td><strong>${escapeHtml(o.displayName || oppKey)}</strong></td>
            <td><input type="number" class="admin-input" id="adm_opp_gw_${i}" value="${o.gamesWon || 0}" min="0" /></td>
            <td><input type="number" class="admin-input" id="adm_opp_gl_${i}" value="${o.gamesLost || 0}" min="0" /></td>
            <td><input type="number" class="admin-input" id="adm_opp_sw_${i}" value="${o.setsWon || 0}" min="0" /></td>
            <td><input type="number" class="admin-input" id="adm_opp_sl_${i}" value="${o.setsLost || 0}" min="0" /></td>
            <td style="white-space:nowrap;">
              <button class="btn-sm" style="padding:3px 6px;" onclick="adminSaveSingleOpponent('${escapeHtml(userKey)}', '${escapeHtml(oppKey)}', ${i})">Save</button>
              <button class="btn-sm" style="padding:3px 6px; background:#e53935; color:#fff;" onclick="adminDeleteSingleOpponent('${escapeHtml(userKey)}', '${escapeHtml(oppKey)}')">Del</button>
            </td>
          </tr>
        `;
      });
    }

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong style="color:var(--accent); font-size:0.82rem;">Head-to-Head Opponents for ${escapeHtml(u.name)}</strong>
        <button class="btn-sm" style="background:#546e7a; color:#fff; padding:3px 8px;" onclick="document.getElementById('adminOpponentsEditor').style.display='none'">Close</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Opponent</th>
            <th>Games W</th>
            <th>Games L</th>
            <th>Sets W</th>
            <th>Sets L</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
    box.style.display = "block";
  }

  function adminSaveSingleOpponent(userKey, oppKey, i) {
    const fields = {
      gamesWon: document.getElementById(`adm_opp_gw_${i}`).value,
      gamesLost: document.getElementById(`adm_opp_gl_${i}`).value,
      setsWon: document.getElementById(`adm_opp_sw_${i}`).value,
      setsLost: document.getElementById(`adm_opp_sl_${i}`).value
    };
    window.TavliDB.adminSaveOpponentRecord(userKey, oppKey, fields);
    document.getElementById("adminFeedback").style.color = "#00e676";
    document.getElementById("adminFeedback").textContent = `Updated opponent "${oppKey}" for "${userKey}"!`;
    syncDatabaseWithPeer();
    adminOpenOpponentsEditor(userKey);
  }

  function adminDeleteSingleOpponent(userKey, oppKey) {
    window.TavliDB.adminDeleteOpponentRecord(userKey, oppKey);
    syncDatabaseWithPeer();
    adminOpenOpponentsEditor(userKey);
  }

  async function adminSaveRow(originalKey, idx) {
    const sw = parseInt(document.getElementById(`adm_sw_${idx}`).value, 10) || 0;
    const sl = parseInt(document.getElementById(`adm_sl_${idx}`).value, 10) || 0;
    const gw = parseInt(document.getElementById(`adm_gw_${idx}`).value, 10) || 0;
    const gl = parseInt(document.getElementById(`adm_gl_${idx}`).value, 10) || 0;

    const fields = {
      name: document.getElementById(`adm_name_${idx}`).value,
      newPin: document.getElementById(`adm_pin_${idx}`).value,
      setsWon: sw,
      setsLost: sl,
      setsPlayed: sw + sl,
      gamesWon: gw,
      gamesLost: gl,
      gamesPlayed: gw + gl,
      PORTES: {
        won: document.getElementById(`adm_pw_${idx}`).value,
        played: document.getElementById(`adm_pp_${idx}`).value
      },
      PLAKOTO: {
        won: document.getElementById(`adm_plw_${idx}`).value,
        played: document.getElementById(`adm_plp_${idx}`).value
      },
      FEVGA: {
        won: document.getElementById(`adm_fw_${idx}`).value,
        played: document.getElementById(`adm_fp_${idx}`).value
      }
    };

    const res = await window.TavliDB.adminSaveUserRecordAsync(originalKey, fields);
    const fb = document.getElementById("adminFeedback");
    if (!res.ok) {
      fb.style.color = "#ff8a80";
      fb.textContent = res.message;
      return;
    }
    fb.style.color = "#00e676";
    fb.textContent = `Saved & synced "${res.user.name}" to Server!`;
    syncDatabaseWithPeer();
    renderAdminTable();
  }

  function adminDeleteRow(key) {
    if (!confirm(`Delete user "${key}" from the server database?`)) return;
    window.TavliDB.adminDeleteUser(key);
    document.getElementById("adminFeedback").style.color = "#ffb300";
    document.getElementById("adminFeedback").textContent = `Deleted "${key}" from Server.`;
    renderAdminTable();
  }

  async function adminAddNewUser() {
    const name = document.getElementById("adminNewName").value.trim();
    const pin = document.getElementById("adminNewPin").value.trim();
    const fb = document.getElementById("adminFeedback");
    if (window.TavliDB.userExists(name)) {
      fb.style.color = "#ff8a80";
      fb.textContent = "User already exists in the table above.";
      return;
    }
    const res = await window.TavliDB.authenticateOrCreateAsync(name, pin);
    if (!res.ok) {
      fb.style.color = "#ff8a80";
      fb.textContent = res.message;
      return;
    }
    document.getElementById("adminNewName").value = "";
    document.getElementById("adminNewPin").value = "";
    fb.style.color = "#00e676";
    fb.textContent = `Created & synced user "${res.user.name}" (PIN SHA-256 Hashed)!`;
    syncDatabaseWithPeer();
    renderAdminTable();
  }

  function handleImportDBFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const res = await window.TavliDB.importDatabaseJSON(e.target.result);
      const fb = document.getElementById("adminFeedback");
      if (!res.ok) {
        alert(res.message);
      } else {
        if (fb) {
          fb.style.color = "#00e676";
          fb.textContent = "Database JSON loaded, PINs hashed, and pushed to Server!";
        }
        syncDatabaseWithPeer();
        renderAdminTable();
      }
    };
    reader.readAsText(file);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // --- Web Audio API Sound Synthesizer ---
  let audioCtx = null;
  let soundEnabled = true;

  function ensureAudio() {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById("muteBtn").textContent = soundEnabled ? t().soundOn : t().soundOff;
    if (soundEnabled) playCheckerClack(false);
  }

  function playCheckerClack(isHeavy = false) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;

    const triggerHit = (offset, pitchBoost) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(195 * pitchBoost, now + offset);
      osc.frequency.exponentialRampToValueAtTime(58, now + offset + 0.065);

      gain.gain.setValueAtTime(0.45, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.075);

      const bufferSize = ctx.sampleRate * 0.025;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1450 * pitchBoost;
      filter.Q.value = 3.2;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.6, now + offset);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.025);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now + offset);
    };

    triggerHit(0, 1.0);
    if (isHeavy) triggerHit(0.055, 1.18);
  }

  function playDiceRattle() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const bounceTimes = [0, 0.07, 0.15, 0.24, 0.35, 0.47];
    bounceTimes.forEach((tOffset, idx) => {
      const now = ctx.currentTime + tOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const freq = 620 + (idx * 65) + (cryptoDie() * 35);
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

      const vol = 0.28 * Math.pow(0.82, idx);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    });
  }

  function playTurnChime() {
    const ctx = ensureAudio();
    if (!ctx) return;
    [587.33, 880].forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    });
  }

  function playChatSound() {
    const ctx = ensureAudio();
    if (!ctx) return;
    [523.25, 783.99].forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    });
  }

  function playWinFanfare() {
    const ctx = ensureAudio();
    if (!ctx) return;
    [440, 554.37, 659.25, 880, 1046.5].forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  const PEER_CONFIG = {
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
      ]
    }
  };

  let myPlayerName = "Player 1";
  let playerNames = { W: "Player 1", B: "Player 2" };
  let pendingRoomFromUrl = null;
  let rollOffTimer = null;
  let autoRollTimer = null;
  let confettiCleanupTimer = null;
  let activeSetSummaryObj = null;

  let state = {
    variantSequence: ["PORTES", "PLAKOTO", "FEVGA"],
    variantIdx: 0,
    targetScore: 7,
    scoreW: 0,
    scoreB: 0,
    phase: "ROLL_OFF",
    rollOff: { W: null, B: null },
    turn: "W",
    dice: [],
    displayDice: [],
    rolled: false,
    requireEndTurn: true,
    autoRoll: false,
    colors: { W: "white", B: "black" },
    points: [],
    bar: { W: 0, B: 0 },
    off: { W: 0, B: 0 },
    fevgaPassed: { W: false, B: false },
    setGamesLog: [],
    setRollCounts: { W: {}, B: {} },
    lastAction: "INIT",
    lastMoveAnim: null,
    lastWinEvent: null,
    lastSetSummary: null
  };

  let lastRecordedWinEventId = null;
  let lastShownSummaryId = null;
  let myRematchVote = false;
  let peerRematchVote = false;

  let turnHistory = [];
  let selectedFrom = null;
  let validTargets = [];
  let isAnimatingDice = false;
  let isAnimatingChecker = false;
  let lastPointTap = { idx: -1, time: 0 };

  let peer = null;
  let conn = null;
  let myRole = "BOTH";
  let activeRoomCode = "";
  let opponentLeftHandled = false;
  let localTypingTimeout = null;
  let remoteTypingTimeout = null;

  let packetQueue = [];
  let isProcessingPacket = false;

  function saveActiveRoomBackup() {
    if (!activeRoomCode || isAiMatch || state.phase === "SET_OVER") return;
    try {
      const backup = {
        roomCode: activeRoomCode,
        myRole,
        myPlayerName,
        playerNames: cloneState(playerNames),
        state: cloneState(state),
        savedAt: Date.now()
      };
      localStorage.setItem(ROOM_BACKUP_KEY, JSON.stringify(backup));
    } catch (_) {}
  }

  function getActiveRoomBackup(code) {
    try {
      const raw = localStorage.getItem(ROOM_BACKUP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.roomCode) return null;
      if (Date.now() - (parsed.savedAt || 0) > RECONNECT_WINDOW_MS) {
        localStorage.removeItem(ROOM_BACKUP_KEY);
        return null;
      }
      if (code && parsed.roomCode.toUpperCase() !== code.toUpperCase()) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function clearActiveRoomBackup() {
    localStorage.removeItem(ROOM_BACKUP_KEY);
  }

  function currentVariant() {
    const seq = state.variantSequence && state.variantSequence.length ? state.variantSequence : ["PORTES", "PLAKOTO", "FEVGA"];
    return seq[state.variantIdx % seq.length];
  }

  function resetSetTracking() {
    state.setGamesLog = [];
    state.setRollCounts = { W: {}, B: {} };
    state.lastSetSummary = null;
    activeSetSummaryObj = null;
    myRematchVote = false;
    peerRematchVote = false;
  }

  function recordDiceComboInSet(player, d1, d2) {
    if (!state.setRollCounts) state.setRollCounts = { W: {}, B: {} };
    if (!state.setRollCounts[player]) state.setRollCounts[player] = {};
    const hi = Math.max(d1, d2);
    const lo = Math.min(d1, d2);
    const key = `${hi}-${lo}`;
    state.setRollCounts[player][key] = (state.setRollCounts[player][key] || 0) + 1;
  }

  function getMostRolledComboStr(countsMap) {
    const tr = t();
    if (!countsMap || typeof countsMap !== "object") return tr.noRollsRecorded;
    const entries = Object.entries(countsMap);
    if (entries.length === 0) return tr.noRollsRecorded;
    entries.sort((a, b) => b[1] - a[1]);
    const [combo, count] = entries[0];
    return `${combo} (${count}x)`;
  }

  function recordWinEventToDatabase(winEv) {
    if (isAiMatch) return;
    if (!winEv || !winEv.id || winEv.id === lastRecordedWinEventId) return;
    lastRecordedWinEventId = winEv.id;

    const wName = playerNames.W;
    const bName = playerNames.B;
    const wWon = winEv.winner === "W";

    if (!winEv.forfeitSetOnly) {
      window.TavliDB.recordGameOutcome(wName, bName, winEv.variant, wWon);
      window.TavliDB.recordGameOutcome(bName, wName, winEv.variant, !wWon);
    }

    if (winEv.matchOver) {
      window.TavliDB.recordSetOutcome(wName, bName, wWon);
      window.TavliDB.recordSetOutcome(bName, wName, !wWon);
    }

    syncDatabaseWithPeer();
  }

  function updateHeaderLabels() {
    const metaW = getColorMeta(state.colors.W);
    const metaB = getColorMeta(state.colors.B);
    document.getElementById("colorLabelW").textContent = metaW.label;
    document.getElementById("colorLabelB").textContent = metaB.label;
    document.getElementById("nameW").textContent = playerNames.W;
    document.getElementById("nameB").textContent = playerNames.B;
    document.getElementById("targetW").textContent = state.targetScore;
    document.getElementById("targetB").textContent = state.targetScore;
  }

  function cryptoDie() {
    const buf = new Uint8Array(1);
    while (true) {
      window.crypto.getRandomValues(buf);
      if (buf[0] < 252) return (buf[0] % 6) + 1;
    }
  }

  function generateSecureRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const buf = new Uint8Array(6);
    window.crypto.getRandomValues(buf);
    return Array.from(buf, b => chars[b % 32]).join("");
  }

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  function getPath(variant, player) {
    if (variant === "PORTES") {
      if (player === "W") return Array.from({ length: 24 }, (_, i) => i);
      return Array.from({ length: 24 }, (_, i) => 23 - i);
    }
    if (variant === "PLAKOTO") {
      if (player === "W") return Array.from({ length: 24 }, (_, i) => 23 - i);
      return Array.from({ length: 24 }, (_, i) => i);
    }
    if (player === "W") return Array.from({ length: 24 }, (_, i) => i);
    return Array.from({ length: 24 }, (_, i) => (12 + i) % 24);
  }

  function initGame(starter = "ROLL_OFF") {
    if (rollOffTimer) { clearTimeout(rollOffTimer); rollOffTimer = null; }
    if (autoRollTimer) { clearTimeout(autoRollTimer); autoRollTimer = null; }
    if (aiTurnTimer) { clearTimeout(aiTurnTimer); aiTurnTimer = null; }

    const v = currentVariant();
    if (starter === "ROLL_OFF") {
      state.phase = "ROLL_OFF";
      state.rollOff = { W: null, B: null };
      state.turn = "W";
    } else {
      state.phase = "PLAY";
      state.rollOff = { W: null, B: null };
      state.turn = starter;
    }
    state.dice = [];
    state.displayDice = [];
    state.rolled = false;
    state.bar = { W: 0, B: 0 };
    state.off = { W: 0, B: 0 };
    state.fevgaPassed = { W: false, B: false };
    state.lastAction = "INIT";
    state.lastMoveAnim = null;
    state.points = Array.from({ length: 24 }, () => ({ owner: null, count: 0, pinned: null }));

    if (v === "PORTES") {
      setPt(0, "W", 2); setPt(11, "W", 5); setPt(16, "W", 3); setPt(18, "W", 5);
      setPt(23, "B", 2); setPt(12, "B", 5); setPt(7, "B", 3); setPt(5, "B", 5);
    } else if (v === "PLAKOTO") {
      setPt(23, "W", 15);
      setPt(0, "B", 15);
    } else if (v === "FEVGA") {
      setPt(0, "W", 15);
      setPt(12, "B", 15);
    }
    turnHistory = [];
    selectedFrom = null;
    validTargets = [];
    updateHeaderLabels();
    saveActiveRoomBackup();
    render();
    checkTriggerAutoRollOrAI();
  }

  function setPt(idx, owner, count) {
    state.points[idx] = { owner, count, pinned: null };
  }

  function checkTriggerAutoRollOrAI() {
    if (autoRollTimer) { clearTimeout(autoRollTimer); autoRollTimer = null; }
    if (aiTurnTimer) { clearTimeout(aiTurnTimer); aiTurnTimer = null; }
    if (state.phase === "SET_OVER" || isWaitingForReconnect) return;

    if (isAiMatch && state.turn === "B" && !state.rolled && !isAnimatingDice && !isAnimatingChecker) {
      aiTurnTimer = setTimeout(() => {
        if (isAiMatch && state.turn === "B" && !state.rolled && state.phase !== "SET_OVER") {
          handleRoll(true);
        }
      }, 650);
      return;
    }

    if (!state.autoRoll || state.phase !== "PLAY" || state.rolled || isAnimatingDice) return;
    const isMyTurn = (myRole === "BOTH" && !isAiMatch) || myRole === state.turn;
    if (!isMyTurn) return;

    autoRollTimer = setTimeout(() => {
      if (state.autoRoll && state.phase === "PLAY" && !state.rolled && !isAnimatingDice && !isWaitingForReconnect) {
        handleRoll();
      }
    }, 450);
  }

  function handleRoll(triggeredByAi = false) {
    if (state.phase === "SET_OVER" || isWaitingForReconnect || state.rolled || isAnimatingDice || isAnimatingChecker) return;
    if (!triggeredByAi && myRole !== "BOTH" && myRole !== state.turn) return;

    const tr = t();

    if (state.phase === "ROLL_OFF") {
      const d = cryptoDie();
      const roller = state.turn;
      state.rollOff[roller] = d;
      state.lastAction = "ROLL_OFF";
      state.lastMoveAnim = null;

      if (roller === "W") {
        state.turn = "B";
        syncState();
        animateBoardRollOffDie("W", () => {
          setStatus(tr.rolled1DieWait(playerNames.W, d, playerNames.B));
          if (myRole === "BOTH" && !isAiMatch) playTurnChime();
          render();
          checkTriggerAutoRollOrAI();
        });
      } else {
        state.rolled = true;
        syncState();
        animateBoardRollOffDie("B", () => {
          resolveRollOffOutcome();
        });
      }
      return;
    }

    const d1 = cryptoDie();
    const d2 = cryptoDie();
    recordDiceComboInSet(state.turn, d1, d2);
    state.displayDice = [d1, d2];
    state.dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    state.rolled = true;
    state.lastAction = "ROLL";
    state.lastMoveAnim = null;
    turnHistory = [];

    syncState();
    animateDiceRoll(2, () => {
      setStatus(t().rolledPair(d1, d2, d1 === d2));
      if (!hasAnyLegalMove(state.turn)) {
        const curName = state.turn === "W" ? playerNames.W : playerNames.B;
        setStatus(t().noLegalMoves(curName));
        setTimeout(() => {
          handleEndTurn(true);
        }, 1100);
        return;
      }
      render();
      if (isAiMatch && state.turn === "B") {
        setTimeout(() => playAiTurnSequence(), 500);
      }
    });
  }

  // Fevga Temporary 6-Block Rule (Item 3)
  function isFevgaStartingPrimeOccupied(s, player) {
    const seq = s.variantSequence && s.variantSequence.length ? s.variantSequence : ["PORTES", "PLAKOTO", "FEVGA"];
    const v = seq[s.variantIdx % seq.length];
    if (v !== "FEVGA") return false;
    const path = getPath("FEVGA", player);
    const startQuad = path.slice(0, 6);
    return startQuad.every(qIdx => s.points[qIdx].owner === player && s.points[qIdx].count > 0);
  }

  function generateAllLegalTurnSequences(rootState, player) {
    const completed = [];
    const MAX_BRANCHES = 350;

    function dfs(curState, seqSoFar) {
      if (completed.length >= MAX_BRANCHES) return;
      if (curState.dice.length === 0) {
        if (!isFevgaStartingPrimeOccupied(curState, player)) {
          completed.push({ finalState: curState, steps: seqSoFar });
        }
        return;
      }

      const singleMoves = [];
      if (curState.bar[player] > 0) {
        singleMoves.push(...getSingleStepMovesFrom(curState, "BAR", player));
      } else {
        for (let i = 0; i < 24; i++) {
          if (curState.points[i].owner === player && curState.points[i].count > 0) {
            singleMoves.push(...getSingleStepMovesFrom(curState, i, player));
          }
        }
      }

      if (singleMoves.length === 0) {
        if (!isFevgaStartingPrimeOccupied(curState, player)) {
          completed.push({ finalState: curState, steps: seqSoFar });
        }
        return;
      }

      let anyValidBranch = false;
      const seen = new Set();
      for (const m of singleMoves) {
        const key = `${m.from}->${m.to}:${m.die}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const nextS = cloneState(curState);
        const out = applySingleStepToState(nextS, m);
        const nextSeq = [...seqSoFar, m];

        if (out.manaWin || out.bearOffWin) {
          completed.push({ finalState: nextS, steps: nextSeq, instantWin: true });
          anyValidBranch = true;
        } else {
          const before = completed.length;
          dfs(nextS, nextSeq);
          if (completed.length > before) anyValidBranch = true;
        }
      }

      if (!anyValidBranch && seqSoFar.length > 0 && !isFevgaStartingPrimeOccupied(curState, player)) {
        completed.push({ finalState: curState, steps: seqSoFar });
      }
    }

    dfs(rootState, []);
    return completed;
  }

  function evaluateStateProbability(s, aiPlayer) {
    const human = aiPlayer === "W" ? "B" : "W";
    const v = currentVariant();
    const aiPath = getPath(v, aiPlayer);
    const huPath = getPath(v, human);

    if (s.off[aiPlayer] === 15) return 100000;
    if (v === "PLAKOTO") {
      const huStart = human === "W" ? 23 : 0;
      const aiStart = aiPlayer === "W" ? 23 : 0;
      if (s.points[huStart].pinned === human && s.points[aiStart].pinned !== aiPlayer) return 100000;
    }

    let score = 0;
    score += s.off[aiPlayer] * 48;
    score -= s.off[human] * 48;

    let aiPips = s.bar[aiPlayer] * 25;
    let huPips = s.bar[human] * 25;

    for (let step = 0; step < 24; step++) {
      const idxAi = aiPath[step];
      if (s.points[idxAi].owner === aiPlayer) aiPips += s.points[idxAi].count * (24 - step);
      const idxHu = huPath[step];
      if (s.points[idxHu].owner === human) huPips += s.points[idxHu].count * (24 - step);
    }
    score += (huPips - aiPips) * 1.35;
    return score;
  }

  function playAiTurnSequence() {
    if (!isAiMatch || state.turn !== "B" || !state.rolled || state.phase !== "PLAY") return;

    const allSeqs = generateAllLegalTurnSequences(state, "B");
    if (allSeqs.length === 0 || allSeqs[0].steps.length === 0) {
      handleEndTurn(true);
      return;
    }

    let chosen = allSeqs[0];
    let bestScore = -Infinity;
    for (const item of allSeqs) {
      if (item.instantWin) { chosen = item; break; }
      const sc = evaluateStateProbability(item.finalState, "B");
      if (sc > bestScore) { bestScore = sc; chosen = item; }
    }

    const stepsQueue = [...chosen.steps];
    function runNextAiStep() {
      if (stepsQueue.length === 0 || state.turn !== "B" || state.phase !== "PLAY") {
        if (state.turn === "B" && state.phase === "PLAY") setTimeout(() => handleEndTurn(true), 320);
        return;
      }
      const nextStep = stepsQueue.shift();
      executeMoveSequence([nextStep], () => {
        if (state.turn === "B" && state.phase === "PLAY" && stepsQueue.length > 0) {
          setTimeout(runNextAiStep, 260);
        } else if (state.turn === "B" && state.phase === "PLAY") {
          setTimeout(() => handleEndTurn(true), 340);
        }
      });
    }
    runNextAiStep();
  }

  function animateBoardRollOffDie(side, onComplete) {
    isAnimatingDice = true;
    playDiceRattle();
    const leftZone = document.getElementById("rollOffLeftZone");
    const rightZone = document.getElementById("rollOffRightZone");

    const shuffleTimer = setInterval(() => {
      if (side === "W") {
        leftZone.innerHTML = "";
        leftZone.appendChild(createDieEl(cryptoDie(), true, false, "W"));
      } else {
        if (state.rollOff.W !== null && leftZone.children.length === 0) {
          leftZone.appendChild(createDieEl(state.rollOff.W, false, false, "W"));
        }
        rightZone.innerHTML = "";
        rightZone.appendChild(createDieEl(cryptoDie(), true, false, "B"));
      }
    }, 85);

    setTimeout(() => {
      clearInterval(shuffleTimer);
      isAnimatingDice = false;
      render();
      if (onComplete) onComplete();
    }, 550);
  }

  function resolveRollOffOutcome() {
    const wRoll = state.rollOff.W;
    const bRoll = state.rollOff.B;
    if (wRoll === null || bRoll === null) return;
    const tr = t();

    if (wRoll === bRoll) {
      setStatus(tr.rollOffTie(wRoll, bRoll));
      render();
      rollOffTimer = setTimeout(() => {
        state.rollOff = { W: null, B: null };
        state.displayDice = [];
        state.rolled = false;
        state.turn = "W";
        if (myRole === "W" || myRole === "BOTH") playTurnChime();
        render();
        checkTriggerAutoRollOrAI();
      }, 1500);
    } else {
      const winner = wRoll > bRoll ? "W" : "B";
      const winName = winner === "W" ? playerNames.W : playerNames.B;
      setStatus(tr.rollOffWin(playerNames.W, wRoll, playerNames.B, bRoll, winName));
      render();
      rollOffTimer = setTimeout(() => {
        state.phase = "PLAY";
        state.rollOff = { W: null, B: null };
        state.displayDice = [];
        state.dice = [];
        state.rolled = false;
        state.turn = winner;
        if (myRole === winner || (myRole === "BOTH" && !isAiMatch)) playTurnChime();
        setStatus(t().rollOffStart(winName, state.autoRoll || (isAiMatch && winner === "B")));
        saveActiveRoomBackup();
        render();
        checkTriggerAutoRollOrAI();
      }, 1500);
    }
  }

  function animateDiceRoll(numDice = 2, onComplete) {
    isAnimatingDice = true;
    playDiceRattle();
    const leftZone = document.getElementById("rollOffLeftZone");
    const rightZone = document.getElementById("rollOffRightZone");
    const activePlayer = state.turn;

    const shuffleTimer = setInterval(() => {
      leftZone.innerHTML = "";
      rightZone.innerHTML = "";
      leftZone.appendChild(createDieEl(cryptoDie(), true, false, activePlayer));
      if (numDice > 1) rightZone.appendChild(createDieEl(cryptoDie(), true, false, activePlayer));
    }, 85);

    setTimeout(() => {
      clearInterval(shuffleTimer);
      isAnimatingDice = false;
      render();
      if (onComplete) onComplete();
    }, 550);
  }

  function animateCheckerTransition(fromLoc, toLoc, player, onComplete) {
    const srcEl = getSlotOrPointElement(fromLoc, player);
    const dstEl = getSlotOrPointElement(toLoc, player);
    if (!srcEl || !dstEl) {
      if (onComplete) onComplete();
      return;
    }

    const srcCheckers = srcEl.querySelectorAll(".checker:not(.pinned-base)");
    const startTarget = srcCheckers.length > 0 ? srcCheckers[srcCheckers.length - 1] : srcEl;
    const startRect = startTarget.getBoundingClientRect();

    const dstCheckers = dstEl.querySelectorAll(".checker");
    const endTarget = dstCheckers.length > 0 ? dstCheckers[dstCheckers.length - 1] : dstEl;
    const endRect = endTarget.getBoundingClientRect();

    const size = startTarget.classList && startTarget.classList.contains("checker")
      ? startRect.width
      : Math.min(srcEl.getBoundingClientRect().width * 0.78, 38);

    const startX = startRect.left + (startRect.width - size) / 2;
    const startY = startRect.top + (startRect.height - size) / 2;
    const endX = endRect.left + (endRect.width - size) / 2;
    const endY = endRect.top + (endRect.height - size) / 2;

    const flyer = document.createElement("div");
    const ownerColor = state.colors[player];
    flyer.className = `checker clr-${ownerColor} flying-checker`;
    flyer.style.width = `${size}px`;
    flyer.style.height = `${size}px`;
    flyer.style.left = `${startX}px`;
    flyer.style.top = `${startY}px`;

    if (startTarget !== srcEl) {
      const originCount = fromLoc === "BAR"
        ? state.bar[player]
        : (state.points[fromLoc] ? state.points[fromLoc].count : 1);
      const maxVis = (fromLoc !== "BAR" && state.points[fromLoc] && state.points[fromLoc].pinned) ? 4 : 5;
      if (originCount > maxVis) {
        startTarget.textContent = originCount - 1 > maxVis ? String(originCount - 1) : "";
      } else {
        startTarget.style.opacity = "0";
      }
    }

    document.body.appendChild(flyer);
    void flyer.offsetWidth;
    flyer.style.left = `${endX}px`;
    flyer.style.top = `${endY}px`;
    flyer.style.transform = "scale(1.12)";

    isAnimatingChecker = true;
    setTimeout(() => {
      flyer.remove();
      isAnimatingChecker = false;
      if (onComplete) onComplete();
    }, 275);
  }

  function getSlotOrPointElement(loc, player) {
    if (loc === "BAR") return document.querySelector(`[data-bar-owner="${player}"]`);
    if (loc === "OFF") return document.querySelector(`[data-off-owner="${player}"]`);
    return document.querySelector(`.point[data-pt-idx="${loc}"]`);
  }

  function violatesFevgaPrimeRule(s, fromOrigin, destIdx, player, path) {
    const startQuadIndices = path.slice(0, 6);
    let occupiedCount = 0;
    for (const qIdx of startQuadIndices) {
      let c = (s.points[qIdx].owner === player) ? s.points[qIdx].count : 0;
      if (qIdx === fromOrigin) c--;
      if (qIdx === destIdx) c++;
      if (c > 0) occupiedCount++;
    }
    return occupiedCount === 6;
  }

  function getSingleStepMovesFrom(s, origin, player) {
    const seq = s.variantSequence && s.variantSequence.length ? s.variantSequence : ["PORTES", "PLAKOTO", "FEVGA"];
    const v = seq[s.variantIdx % seq.length];
    const path = getPath(v, player);
    const opp = player === "W" ? "B" : "W";
    const uniqueDice = [...new Set(s.dice)];
    const moves = [];

    if (s.bar[player] > 0 && origin !== "BAR") return [];
    if (origin === "BAR" && s.bar[player] === 0) return [];

    let startStep = -1;
    if (origin !== "BAR") {
      const pt = s.points[origin];
      if (!pt || pt.owner !== player || pt.count === 0) return [];
      startStep = path.indexOf(origin);
      if (v === "FEVGA" && startStep === 0 && !s.fevgaPassed[player] && pt.count <= 14) {
        return [];
      }
    }

    const canBearOff = isReadyToBearOffState(s, player, v, path);

    for (const die of uniqueDice) {
      const targetStep = startStep + die;
      if (targetStep >= 24) {
        if (!canBearOff || origin === "BAR") continue;
        if (targetStep === 24) {
          moves.push({ from: origin, to: "OFF", die, exact: true });
        } else {
          const hasFurtherBack = path.slice(18, startStep).some(idx => s.points[idx].owner === player && s.points[idx].count > 0);
          if (!hasFurtherBack) moves.push({ from: origin, to: "OFF", die, exact: false });
        }
        continue;
      }

      const destIdx = path[targetStep];
      const destPt = s.points[destIdx];

      if (v === "PORTES") {
        if (destPt.owner === opp && destPt.count >= 2) continue;
        moves.push({ from: origin, to: destIdx, die });
      } else if (v === "PLAKOTO") {
        if (destPt.owner === opp && destPt.count >= 2) continue;
        if (destPt.pinned !== null && destPt.owner === opp) continue;
        moves.push({ from: origin, to: destIdx, die });
      } else if (v === "FEVGA") {
        if (destPt.owner === opp && destPt.count >= 1) continue;
        if (violatesFevgaPrimeRule(s, origin, destIdx, player, path)) continue;
        moves.push({ from: origin, to: destIdx, die });
      }
    }
    return moves;
  }

  function isReadyToBearOffState(s, player, variant, path) {
    if (s.bar[player] > 0) return false;
    if (variant === "PLAKOTO" && s.points.some(p => p.pinned === player)) return false;
    for (let step = 0; step < 18; step++) {
      const pt = s.points[path[step]];
      if (pt.owner === player && pt.count > 0) return false;
    }
    return true;
  }

  function applySingleStepToState(s, step) {
    const { from, to, die } = step;
    const player = s.turn;
    const opp = player === "W" ? "B" : "W";
    const seq = s.variantSequence && s.variantSequence.length ? s.variantSequence : ["PORTES", "PLAKOTO", "FEVGA"];
    const v = seq[s.variantIdx % seq.length];
    const path = getPath(v, player);
    let wasHitOrPin = false;

    if (from === "BAR") {
      s.bar[player]--;
    } else {
      const src = s.points[from];
      src.count--;
      if (src.count === 0) {
        if (src.pinned) {
          src.owner = src.pinned;
          src.count = 1;
          src.pinned = null;
        } else {
          src.owner = null;
        }
      }
    }

    if (to === "OFF") {
      s.off[player]++;
    } else {
      const dst = s.points[to];
      if (v === "PORTES" && dst.owner === opp && dst.count === 1) {
        dst.owner = player;
        dst.count = 1;
        s.bar[opp]++;
        wasHitOrPin = true;
      } else if (v === "PLAKOTO" && dst.owner === opp && dst.count === 1) {
        dst.pinned = opp;
        dst.owner = player;
        dst.count = 1;
        wasHitOrPin = true;
      } else {
        dst.owner = player;
        dst.count++;
      }

      if (v === "FEVGA" && path.indexOf(to) >= 12) {
        s.fevgaPassed[player] = true;
      }
    }

    const dieIdx = s.dice.indexOf(die);
    if (dieIdx > -1) s.dice.splice(dieIdx, 1);

    let manaWin = false;
    if (v === "PLAKOTO") {
      const oppStartIdx = opp === "W" ? 23 : 0;
      const myStartIdx = player === "W" ? 23 : 0;
      if (s.points[oppStartIdx].pinned === opp && s.points[myStartIdx].pinned !== player) {
        manaWin = true;
      }
    }

    return { wasHitOrPin, manaWin, bearOffWin: s.off[player] === 15 };
  }

  function getMovesFrom(origin, player) {
    const validSeqs = generateAllLegalTurnSequences(state, player);
    const resultsByDest = new Map();

    for (const seqObj of validSeqs) {
      const steps = seqObj.steps;
      if (steps.length === 0 || steps[0].from !== origin) continue;

      const firstStep = steps[0];
      if (!resultsByDest.has(firstStep.to)) {
        resultsByDest.set(firstStep.to, {
          to: firstStep.to,
          steps: [firstStep],
          badge: `${firstStep.die}`
        });
      }

      const chained = [firstStep];
      let currentPos = firstStep.to;
      for (let k = 1; k < steps.length; k++) {
        if (currentPos !== "OFF" && steps[k].from === currentPos) {
          chained.push(steps[k]);
          currentPos = steps[k].to;
          const totalDist = chained.reduce((sum, st) => sum + st.die, 0);
          if (!resultsByDest.has(currentPos)) {
            resultsByDest.set(currentPos, {
              to: currentPos,
              steps: [...chained],
              badge: `${totalDist}`
            });
          }
        } else {
          break;
        }
      }
    }

    return Array.from(resultsByDest.values());
  }

  function hasAnyLegalMove(player) {
    return generateAllLegalTurnSequences(state, player).length > 0;
  }

  function tryBearOffFromPoint(idx) {
    if (state.phase !== "PLAY" || isWaitingForReconnect || !state.rolled || isAnimatingDice || isAnimatingChecker) return false;
    if (myRole !== "BOTH" && myRole !== state.turn) return false;

    const player = state.turn;
    const moves = getMovesFrom(idx, player).filter(m => m.to === "OFF" && m.steps.length === 1);
    if (moves.length === 0) return false;

    executeMoveSequence(moves[0].steps);
    return true;
  }

  function selectBar(player) {
    if (state.phase !== "PLAY" || isWaitingForReconnect || !state.rolled || isAnimatingDice || isAnimatingChecker || state.turn !== player) return;
    if (myRole !== "BOTH" && myRole !== state.turn) return;
    selectedFrom = "BAR";
    validTargets = getMovesFrom("BAR", player);
    render();
  }

  function handlePointClick(idx) {
    if (state.phase !== "PLAY" || isWaitingForReconnect || !state.rolled || isAnimatingDice || isAnimatingChecker) return;
    if (myRole !== "BOTH" && myRole !== state.turn) return;

    const now = Date.now();
    const isDoubleTap = (lastPointTap.idx === idx && (now - lastPointTap.time) < 360);
    lastPointTap = { idx, time: now };

    if (isDoubleTap && state.points[idx].owner === state.turn && state.points[idx].count > 0) {
      if (tryBearOffFromPoint(idx)) {
        lastPointTap = { idx: -1, time: 0 };
        return;
      }
    }

    const move = validTargets.find(m => m.to === idx);
    if (move && selectedFrom !== null) {
      executeMoveSequence(move.steps);
      return;
    }

    if (state.points[idx].owner === state.turn && state.points[idx].count > 0) {
      selectedFrom = idx;
      validTargets = getMovesFrom(idx, state.turn);
      render();
    }
  }

  function attemptBearOff() {
    if (state.phase !== "PLAY" || isWaitingForReconnect || !state.rolled || isAnimatingDice || isAnimatingChecker || selectedFrom === null) return;
    if (myRole !== "BOTH" && myRole !== state.turn) return;
    const move = validTargets.find(m => m.to === "OFF");
    if (move) executeMoveSequence(move.steps);
  }

  function executeMoveSequence(steps, onSequenceDone = null) {
    const startOrigin = steps[0].from;
    const finalDest = steps[steps.length - 1].to;
    const movingPlayer = state.turn;

    selectedFrom = null;
    validTargets = [];

    animateCheckerTransition(startOrigin, finalDest, movingPlayer, () => {
      turnHistory.push(cloneState(state));

      const player = state.turn;
      const opp = player === "W" ? "B" : "W";
      let anyHitOrPin = false;
      let manaWin = false;
      let bearOffWin = false;

      for (const step of steps) {
        const outcome = applySingleStepToState(state, step);
        if (outcome.wasHitOrPin) anyHitOrPin = true;
        if (outcome.manaWin) { manaWin = true; break; }
        if (outcome.bearOffWin) { bearOffWin = true; break; }
      }

      playCheckerClack(anyHitOrPin);
      state.lastAction = anyHitOrPin ? "HIT" : "MOVE";
      state.lastMoveAnim = { from: startOrigin, to: finalDest, player };

      if (manaWin) {
        finishGame(player, 2, t().manaWin, { from: startOrigin, to: finalDest, player });
        return;
      }

      if (bearOffWin) {
        const pts = state.off[opp] === 0 ? 2 : 1;
        const wName = player === "W" ? playerNames.W : playerNames.B;
        finishGame(player, pts, t().gameWin(wName, pts, wName), { from: startOrigin, to: finalDest, player });
        return;
      }

      if (onSequenceDone) {
        render();
        onSequenceDone();
        return;
      }

      const turnFinished = state.dice.length === 0 || !hasAnyLegalMove(state.turn);
      if (turnFinished) {
        if (!state.requireEndTurn) {
          syncState();
          render();
          setTimeout(() => {
            handleEndTurn(true);
          }, 320);
          return;
        }
        setStatus(t().movesComplete);
      }

      syncState();
      render();
    });
  }

  function handleUndo() {
    if (turnHistory.length === 0 || isWaitingForReconnect || isAnimatingDice || isAnimatingChecker) return;
    if (myRole !== "BOTH" && myRole !== state.turn) return;

    state = turnHistory.pop();
    state.lastAction = "UNDO";
    state.lastMoveAnim = null;
    selectedFrom = null;
    validTargets = [];
    playCheckerClack(false);
    setStatus(t().moveUndone);
    syncState();
    render();
  }

  function handleEndTurn(forcedOrAuto = false) {
    if (!state.rolled || isWaitingForReconnect || isAnimatingDice || isAnimatingChecker) return;
    if (!forcedOrAuto && myRole !== "BOTH" && myRole !== state.turn) return;
    if (!forcedOrAuto && state.dice.length > 0 && hasAnyLegalMove(state.turn)) return;
    if (!forcedOrAuto && isFevgaStartingPrimeOccupied(state, state.turn)) return;

    state.turn = state.turn === "W" ? "B" : "W";
    state.rolled = false;
    state.dice = [];
    state.displayDice = [];
    state.lastAction = "END_TURN";
    state.lastMoveAnim = null;
    turnHistory = [];
    selectedFrom = null;
    validTargets = [];

    const nextName = state.turn === "W" ? playerNames.W : playerNames.B;
    const willAutoRoll = state.autoRoll || (isAiMatch && state.turn === "B");
    setStatus(t().nextTurnStatus(nextName, willAutoRoll));

    if ((myRole === "BOTH" && !isAiMatch) || (isAiMatch && state.turn === "W")) {
      playTurnChime();
    }

    syncState();
    render();
    checkTriggerAutoRollOrAI();
  }

  function finishGame(winner, pts, reason, winningMoveAnim = null) {
    playWinFanfare();
    const playedVariant = currentVariant();
    turnHistory = [];
    if (winner === "W") state.scoreW += pts; else state.scoreB += pts;
    setStatus(reason);

    if (!Array.isArray(state.setGamesLog)) state.setGamesLog = [];
    state.setGamesLog.push({
      gameNum: state.setGamesLog.length + 1,
      variant: playedVariant,
      winner,
      pts
    });

    const target = state.targetScore || 7;
    const isMatchOver = (state.scoreW >= target || state.scoreB >= target);

    let winEv = null;
    if (!isAiMatch) {
      winEv = {
        id: Date.now() + "-" + cryptoDie(),
        winner,
        variant: playedVariant,
        matchOver: isMatchOver
      };
      state.lastWinEvent = winEv;
      recordWinEventToDatabase(winEv);
    } else {
      state.lastWinEvent = null;
    }

    if (isMatchOver) {
      clearActiveRoomBackup();
      const summaryObj = {
        id: "SET-" + Date.now() + "-" + cryptoDie(),
        champRole: winner,
        scoreW: state.scoreW,
        scoreB: state.scoreB,
        target,
        gamesLog: cloneState(state.setGamesLog),
        rollCounts: cloneState(state.setRollCounts || { W: {}, B: {} })
      };
      state.phase = "SET_OVER";
      state.rolled = false;
      state.dice = [];
      state.displayDice = [];
      state.lastSetSummary = summaryObj;
      state.lastAction = "WIN";
      state.lastMoveAnim = winningMoveAnim;
      state.lastWinEvent = winEv;

      syncState();
      render();
      showSetVictoryModal(summaryObj);
    } else {
      state.variantIdx = (state.variantIdx + 1) % state.variantSequence.length;
      initGame(winner);
      state.lastAction = "WIN";
      state.lastMoveAnim = winningMoveAnim;
      state.lastWinEvent = winEv;
      syncState();
      render();
    }
  }

  function openResignOfferModal() {
    if (state.phase !== "PLAY" || isWaitingForReconnect) return;
    document.getElementById("resignOfferModal").style.display = "flex";
  }

  function closeResignOfferModal() {
    document.getElementById("resignOfferModal").style.display = "none";
  }

  function sendResignOffer(pts) {
    closeResignOfferModal();
    const validPts = pts === 2 ? 2 : 1;
    const resigningRole = myRole === "BOTH" ? state.turn : myRole;
    const winnerRole = resigningRole === "W" ? "B" : "W";
    const loserName = resigningRole === "W" ? playerNames.W : playerNames.B;
    const winnerName = winnerRole === "W" ? playerNames.W : playerNames.B;
    const tr = t();

    if (isAiMatch) {
      finishGame(winnerRole, validPts, tr.resignAcceptedReason(loserName, winnerName, validPts));
      return;
    }

    if (conn && conn.open) {
      pendingResignOffer = { fromRole: resigningRole, pts: validPts };
      conn.send({
        type: "RESIGN_OFFER",
        fromRole: resigningRole,
        pts: validPts
      });
      setStatus(tr.resignSent(validPts));
      return;
    }

    pendingResignOffer = { fromRole: resigningRole, pts: validPts };
    document.getElementById("resignRespDesc").textContent = tr.resignRespDesc(loserName, validPts);
    document.getElementById("resignRespondModal").style.display = "flex";
  }

  function respondToResignOffer(accepted) {
    document.getElementById("resignRespondModal").style.display = "none";
    if (!pendingResignOffer) return;

    const { fromRole, pts } = pendingResignOffer;
    pendingResignOffer = null;
    const winnerRole = fromRole === "W" ? "B" : "W";
    const loserName = fromRole === "W" ? playerNames.W : playerNames.B;
    const winnerName = winnerRole === "W" ? playerNames.W : playerNames.B;
    const tr = t();

    if (conn && conn.open) {
      conn.send({
        type: "RESIGN_RESPONSE",
        accepted,
        fromRole,
        pts
      });
    }

    if (accepted) {
      finishGame(winnerRole, pts, tr.resignAcceptedReason(loserName, winnerName, pts));
    } else {
      setStatus(tr.resignDeclined(winnerName));
    }
  }

  function spawnCelebrationConfetti() {
    const layer = document.getElementById("confettiLayer");
    if (!layer) return;
    if (confettiCleanupTimer) clearTimeout(confettiCleanupTimer);
    layer.innerHTML = "";
    const colors = ["#ffb300", "#00e676", "#4fc3f7", "#ff5252", "#ce93d8", "#ffee58"];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = `${(i * 2.8) % 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = `${1.4 + (i % 4) * 0.18}s`;
      piece.style.animationDelay = `${(i % 5) * 0.08}s`;
      layer.appendChild(piece);
    }
    confettiCleanupTimer = setTimeout(() => {
      layer.innerHTML = "";
    }, 2000);
  }

  function changeSetGamesPage(delta) {
    setGamesCurrentPage += delta;
    renderSetVictoryModalBody();
  }

  function showSetVictoryModal(summary) {
    if (!summary || summary.id === lastShownSummaryId) return;
    lastShownSummaryId = summary.id;
    activeSetSummaryObj = summary;
    setGamesCurrentPage = 1;
    myRematchVote = false;
    peerRematchVote = false;

    renderSetVictoryModalBody();
    spawnCelebrationConfetti();
    document.getElementById("setSummaryModal").style.display = "flex";
  }

  function renderSetVictoryModalBody() {
    const summary = activeSetSummaryObj;
    if (!summary) return;

    const tr = t();
    const champName = summary.champRole === "W" ? playerNames.W : playerNames.B;
    const topComboW = getMostRolledComboStr(summary.rollCounts && summary.rollCounts.W);
    const topComboB = getMostRolledComboStr(summary.rollCounts && summary.rollCounts.B);

    const allGames = summary.gamesLog || [];
    const gamesWonW = allGames.filter(g => g.winner === "W").length;
    const gamesWonB = allGames.filter(g => g.winner === "B").length;

    const totalPages = Math.max(1, Math.ceil(allGames.length / PAGE_SIZE));
    if (setGamesCurrentPage > totalPages) setGamesCurrentPage = totalPages;
    if (setGamesCurrentPage < 1) setGamesCurrentPage = 1;

    const startIdx = (setGamesCurrentPage - 1) * PAGE_SIZE;
    const pageGames = allGames.slice(startIdx, startIdx + PAGE_SIZE);

    let gamesRows = "";
    pageGames.forEach(g => {
      const wName = g.winner === "W" ? playerNames.W : playerNames.B;
      const vLabel = tr.variants[g.variant] || g.variant;
      const ptsLabel = g.forfeit ? "Forfeit (Set Win)" : (g.pts === 2 ? "+2 (Diplo • 1 Game Win)" : "+1 (Moni • 1 Game Win)");
      gamesRows += `
        <tr>
          <td>#${g.gameNum}</td>
          <td>${escapeHtml(vLabel)}</td>
          <td><strong style="color:var(--accent);">${escapeHtml(wName)}</strong></td>
          <td>${ptsLabel}</td>
        </tr>
      `;
    });

    const pagerHtml = totalPages > 1 ? `
      <div class="pagination-bar">
        <button onclick="changeSetGamesPage(-1)" ${setGamesCurrentPage <= 1 ? "disabled" : ""}>${tr.prevPage}</button>
        <span>${tr.pageOf(setGamesCurrentPage, totalPages)}</span>
        <button onclick="changeSetGamesPage(1)" ${setGamesCurrentPage >= totalPages ? "disabled" : ""}>${tr.nextPage}</button>
      </div>
    ` : "";

    const content = document.getElementById("setSummaryContent");
    content.innerHTML = `
      <div class="trophy-banner">
        <div class="trophy-icon">🏆</div>
        <div class="winner-headline">${escapeHtml(tr.setWinHeadline(champName))}</div>
        <div style="font-size:0.82rem; color:#ffecb3; margin-top:4px;">
          ${escapeHtml(tr.setScoreSub(summary.scoreW, summary.scoreB, summary.target, gamesWonW, gamesWonB, allGames.length))}
        </div>
      </div>

      <div class="sub-heading">${tr.setGamesHeading}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${tr.colGameNum}</th>
            <th>${tr.colVariant}</th>
            <th>${tr.colWinner}</th>
            <th>${tr.colPts}</th>
          </tr>
        </thead>
        <tbody>${gamesRows}</tbody>
      </table>
      ${pagerHtml}

      <div class="sub-heading">${tr.setTopDiceHeading}</div>
      <div class="stat-grid" style="grid-template-columns: 1fr 1fr;">
        <div class="stat-box">
          <div class="val" style="font-size:1rem;">🎲 ${escapeHtml(topComboW)}</div>
          <div class="lbl">${escapeHtml(playerNames.W)}</div>
        </div>
        <div class="stat-box">
          <div class="val" style="font-size:1rem;">🎲 ${escapeHtml(topComboB)}</div>
          <div class="lbl">${escapeHtml(playerNames.B)}</div>
        </div>
      </div>

      <p style="font-size:0.8rem; color:#d7ccc8; text-align:center; margin-top:8px;">
        ${escapeHtml(tr.setPlayAgainPrompt)}
      </p>
      <div id="rematchWaitMsg" style="font-size:0.78rem; color:var(--valid); text-align:center; font-weight:bold; min-height:18px; margin-top:4px;">
        ${myRematchVote ? escapeHtml(tr.waitingOpponentRematch) : ""}
      </div>

      <div class="set-Action-row">
        <button class="btn-play-again" id="btnRematchConfirm" onclick="handlePlayAgainSameSettings()" ${myRematchVote ? "disabled" : ""}>${tr.btnPlayAgain}</button>
        <button class="btn-exit-menu" onclick="handleExitToInitialMenu(true)">${tr.btnExitMenu}</button>
      </div>
    `;
  }

  function startNewSetWithSameSettings() {
    document.getElementById("setSummaryModal").style.display = "none";
    state.scoreW = 0;
    state.scoreB = 0;
    state.variantIdx = 0;
    resetSetTracking();
    initGame("ROLL_OFF");
    if (myRole === "W") syncState();
  }

  function handlePlayAgainSameSettings() {
    if (!conn || !conn.open || isAiMatch) {
      startNewSetWithSameSettings();
      return;
    }

    myRematchVote = true;
    const btn = document.getElementById("btnRematchConfirm");
    if (btn) btn.disabled = true;
    const waitEl = document.getElementById("rematchWaitMsg");
    if (waitEl) waitEl.textContent = t().waitingOpponentRematch;

    conn.send({ type: "SET_DECISION", decision: "PLAY_AGAIN" });
    if (peerRematchVote) startNewSetWithSameSettings();
  }

  function handleExitToInitialMenu(notifyPeer = true) {
    stopDisconnectCountdown();
    clearActiveRoomBackup();
    document.getElementById("setSummaryModal").style.display = "none";
    document.getElementById("playConfigModal").style.display = "none";

    if (notifyPeer && conn && conn.open) {
      try { conn.send({ type: "SET_DECISION", decision: "EXIT_MENU" }); } catch (_) {}
    }
    if (conn) {
      try { conn.close(); } catch (_) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (_) {}
      peer = null;
    }

    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    activeRoomCode = "";
    pendingRoomFromUrl = null;
    isAiMatch = false;
    myRole = "BOTH";
    opponentLeftHandled = false;
    document.getElementById("shareBtn").style.display = "none";
    document.getElementById("netBar").classList.remove("left-alert");
    document.getElementById("netStatus").textContent = t().netDefault;

    showScreen("LANDING");
  }

  function stopDisconnectCountdown() {
    if (disconnectInterval) {
      clearInterval(disconnectInterval);
      disconnectInterval = null;
    }
    isWaitingForReconnect = false;
    opponentLeftHandled = false;
    const pill = document.getElementById("disconnectCountdown");
    if (pill) pill.style.display = "none";
    document.getElementById("netBar").classList.remove("left-alert");
  }

  function formatCountdownMMSS(msRemaining) {
    const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function awardForfeitSetWinToConnectedPlayer() {
    stopDisconnectCountdown();
    clearActiveRoomBackup();

    const winnerRole = myRole === "B" ? "B" : "W";
    const loserRole = winnerRole === "W" ? "B" : "W";
    const winnerName = winnerRole === "W" ? playerNames.W : playerNames.B;
    const loserName = loserRole === "W" ? playerNames.W : playerNames.B;
    const tr = t();
    const target = state.targetScore || 7;

    if (winnerRole === "W") state.scoreW = Math.max(state.scoreW, target);
    else state.scoreB = Math.max(state.scoreB, target);

    const reason = tr.forfeitTimeoutReason(loserName, winnerName);
    setStatus(reason);

    const playedVariant = currentVariant();
    if (!Array.isArray(state.setGamesLog)) state.setGamesLog = [];
    state.setGamesLog.push({
      gameNum: state.setGamesLog.length + 1,
      variant: playedVariant,
      winner: winnerRole,
      pts: 1,
      forfeit: true
    });

    const winEv = {
      id: "FORFEIT-" + Date.now(),
      winner: winnerRole,
      variant: playedVariant,
      matchOver: true,
      forfeitSetOnly: false
    };
    recordWinEventToDatabase(winEv);

    const summaryObj = {
      id: "SET-FORFEIT-" + Date.now(),
      champRole: winnerRole,
      scoreW: state.scoreW,
      scoreB: state.scoreB,
      target,
      gamesLog: cloneState(state.setGamesLog),
      rollCounts: cloneState(state.setRollCounts || { W: {}, B: {} })
    };
    state.phase = "SET_OVER";
    state.rolled = false;
    state.dice = [];
    state.displayDice = [];
    state.lastSetSummary = summaryObj;

    playWinFanfare();
    render();
    showSetVictoryModal(summaryObj);
  }

  function hostRoom(reconnectingCode = null, restoredBackup = null) {
    ensureAudio();
    stopDisconnectCountdown();
    isAiMatch = false;
    const code = reconnectingCode || generateSecureRoomCode();
    activeRoomCode = code;
    packetQueue = [];
    isProcessingPacket = false;
    if (peer) peer.destroy();

    peer = new Peer("tavli-net-" + code, PEER_CONFIG);
    document.getElementById("netStatus").textContent = t().hostingWait(code);
    document.getElementById("shareBtn").style.display = "inline-block";
    myRole = "W";

    if (restoredBackup && restoredBackup.state) {
      playerNames = cloneState(restoredBackup.playerNames || { W: myPlayerName, B: "Friend" });
      state = cloneState(restoredBackup.state);
      updateHeaderLabels();
      render();
    } else {
      playerNames.W = myPlayerName;
      state.colors.W = myChosenColor;
      if (state.colors.B === state.colors.W) {
        state.colors.B = getDistinctFallbackColor(state.colors.W);
      }
      state.requireEndTurn = myEndTurnPref;
      state.autoRoll = myAutoRollPref;
      state.targetScore = myTargetScorePref;
      state.variantSequence = getSequenceForMode(myGameModePref);
      state.variantIdx = 0;
      state.scoreW = 0;
      state.scoreB = 0;
      resetSetTracking();
      initGame("ROLL_OFF");
    }

    peer.on("open", () => {
      if (!restoredBackup) shareInviteLink(code);
    });

    peer.on("connection", incomingConn => {
      if (conn && conn.open && !isWaitingForReconnect) {
        incomingConn.on("open", () => incomingConn.close());
        return;
      }
      conn = incomingConn;
      setupConn(code);
    });
    peer.on("disconnected", () => peer.reconnect());
  }

  function joinRoomWithCode(rawCode) {
    ensureAudio();
    isAiMatch = false;
    const code = String(rawCode || "").trim().toUpperCase();
    if (code.length !== 6) return alert(t().enter6CodeAlert);

    const backup = getActiveRoomBackup(code);
    if (backup && backup.myRole === "W") {
      hostRoom(code, backup);
      return;
    }

    stopDisconnectCountdown();
    activeRoomCode = code;
    packetQueue = [];
    isProcessingPacket = false;
    if (peer) peer.destroy();

    peer = new Peer(PEER_CONFIG);
    myRole = "B";
    document.getElementById("shareBtn").style.display = "none";
    if (backup && backup.state) {
      playerNames = cloneState(backup.playerNames || { W: "Host", B: myPlayerName });
      state = cloneState(backup.state);
    } else {
      playerNames.B = myPlayerName;
    }
    updateHeaderLabels();
    render();

    document.getElementById("netStatus").textContent = t().connectingTo(code);
    peer.on("open", () => {
      conn = peer.connect("tavli-net-" + code, { reliable: true });
      setupConn(code, Boolean(backup));
    });
    peer.on("disconnected", () => peer.reconnect());
  }

  function handleOpponentLeft() {
    if (opponentLeftHandled || state.phase === "SET_OVER") return;
    opponentLeftHandled = true;
    isWaitingForReconnect = true;

    saveActiveRoomBackup();

    const oppName = myRole === "W" ? playerNames.B : playerNames.W;
    const tr = t();
    document.getElementById("typingIndicator").textContent = "";
    document.getElementById("netBar").classList.add("left-alert");
    document.getElementById("netStatus").textContent = tr.oppLeftBanner(oppName, activeRoomCode);
    setStatus(tr.oppLeftStatus(oppName));
    appendChatLine(tr.sysLabel, tr.oppLeftChat(oppName, activeRoomCode), "SYS");

    disconnectDeadline = Date.now() + RECONNECT_WINDOW_MS;
    const pill = document.getElementById("disconnectCountdown");
    pill.style.display = "inline-block";
    pill.textContent = formatCountdownMMSS(RECONNECT_WINDOW_MS);

    if (disconnectInterval) clearInterval(disconnectInterval);
    disconnectInterval = setInterval(() => {
      const rem = disconnectDeadline - Date.now();
      if (rem <= 0) {
        awardForfeitSetWinToConnectedPlayer();
        return;
      }
      pill.textContent = formatCountdownMMSS(rem);

      if (myRole === "B" && isWaitingForReconnect && peer && !peer.destroyed && Math.ceil(rem / 1000) % 4 === 0) {
        try {
          const probeConn = peer.connect("tavli-net-" + activeRoomCode, { reliable: true });
          probeConn.on("open", () => {
            conn = probeConn;
            setupConn(activeRoomCode, true);
          });
        } catch (_) {}
      }
    }, 1000);

    render();
  }

  function syncDatabaseWithPeer() {
    if (conn && conn.open) {
      conn.send({
        type: "DB_SYNC",
        snapshot: window.TavliDB.exportPublicSnapshot(),
        role: myRole,
        name: myPlayerName
      });
    }
  }

  function setupConn(code, isReconnectingAttempt = false) {
    conn.on("open", () => {
      const wasWaiting = isWaitingForReconnect;
      stopDisconnectCountdown();
      document.getElementById("netStatus").textContent = t().roomLocked(code);

      const backup = getActiveRoomBackup(code);
      const hasProgress = (state.scoreW > 0 || state.scoreB > 0 || state.rolled || (state.setGamesLog && state.setGamesLog.length > 0));

      conn.send({
        type: "HELLO",
        role: myRole,
        name: myPlayerName,
        color: myChosenColor,
        isReconnect: Boolean(wasWaiting || isReconnectingAttempt || hasProgress || backup),
        savedState: (wasWaiting || hasProgress) ? cloneState(state) : (backup ? backup.state : null),
        savedNames: (wasWaiting || hasProgress) ? cloneState(playerNames) : (backup ? backup.playerNames : null),
        dbSnapshot: window.TavliDB.exportPublicSnapshot()
      });
    });

    conn.on("close", () => handleOpponentLeft());
    conn.on("error", () => handleOpponentLeft());

    conn.on("data", packet => {
      if (!packet || typeof packet !== "object") return;

      if (packet.type === "BYE") {
        handleOpponentLeft();
        return;
      }

      if (packet.type === "RESIGN_OFFER") {
        const fromRole = packet.fromRole === "W" ? "W" : "B";
        const pts = packet.pts === 2 ? 2 : 1;
        const offererName = fromRole === "W" ? playerNames.W : playerNames.B;
        pendingResignOffer = { fromRole, pts };
        playChatSound();
        document.getElementById("resignRespDesc").textContent = t().resignRespDesc(offererName, pts);
        document.getElementById("resignRespondModal").style.display = "flex";
        return;
      }

      if (packet.type === "RESIGN_RESPONSE") {
        pendingResignOffer = null;
        if (!packet.accepted) {
          const winnerRole = packet.fromRole === "W" ? "B" : "W";
          const winnerName = winnerRole === "W" ? playerNames.W : playerNames.B;
          setStatus(t().resignDeclined(winnerName));
        }
        return;
      }

      if (packet.type === "SET_DECISION") {
        if (packet.decision === "EXIT_MENU") {
          opponentLeftHandled = true;
          handleExitToInitialMenu(false);
        } else if (packet.decision === "PLAY_AGAIN") {
          peerRematchVote = true;
          if (myRematchVote) startNewSetWithSameSettings();
        }
        return;
      }

      if (packet.type === "DB_SYNC") {
        if (packet.snapshot) window.TavliDB.mergePublicSnapshot(packet.snapshot);
        if (packet.name) {
          const cleanName = String(packet.name).slice(0, 16);
          if (packet.role === "W") playerNames.W = cleanName;
          if (packet.role === "B") playerNames.B = cleanName;
          updateHeaderLabels();
          render();
        }
        return;
      }

      if (packet.type === "TYPING") {
        const oppName = myRole === "W" ? playerNames.B : playerNames.W;
        const ind = document.getElementById("typingIndicator");
        if (packet.isTyping) {
          ind.textContent = t().isTyping(oppName);
          if (remoteTypingTimeout) clearTimeout(remoteTypingTimeout);
          remoteTypingTimeout = setTimeout(() => { ind.textContent = ""; }, 2600);
        } else {
          ind.textContent = "";
        }
        return;
      }

      if (packet.type === "HELLO") {
        stopDisconnectCountdown();
        if (packet.dbSnapshot) window.TavliDB.mergePublicSnapshot(packet.dbSnapshot);
        const cleanName = String(packet.name || "Friend").slice(0, 16);
        const reqColor = CHECKER_COLORS.some(c => c.id === packet.color) ? packet.color : "black";

        if (packet.role === "W") {
          playerNames.W = cleanName;
          state.colors.W = reqColor;
        } else if (packet.role === "B") {
          playerNames.B = cleanName;
          state.colors.B = (reqColor === state.colors.W) ? getDistinctFallbackColor(state.colors.W) : reqColor;
        }

        const localHasProgress = (state.scoreW > 0 || state.scoreB > 0 || state.rolled || (state.setGamesLog && state.setGamesLog.length > 0));
        if (packet.isReconnect && (localHasProgress || packet.savedState)) {
          if (!localHasProgress && packet.savedState) {
            state = cloneState(packet.savedState);
            if (packet.savedNames) playerNames = cloneState(packet.savedNames);
          }
          updateHeaderLabels();
          appendChatLine(t().sysLabel, t().oppRejoinedChat(cleanName), "SYS");
          setStatus(t().oppRejoinedStatus(cleanName));
          saveActiveRoomBackup();
          syncState();
          syncDatabaseWithPeer();
          playTurnChime();
          render();
          checkTriggerAutoRollOrAI();
          return;
        }

        updateHeaderLabels();
        appendChatLine(t().sysLabel, t().joinedTableChat(cleanName), "SYS");

        if (myRole === "W") {
          state.scoreW = 0;
          state.scoreB = 0;
          state.variantIdx = 0;
          resetSetTracking();
          initGame("ROLL_OFF");
          syncState();
          syncDatabaseWithPeer();
          playTurnChime();
        }
        render();
        return;
      }

      if (packet.type === "CHAT") {
        const sender = String(packet.sender || "Friend").slice(0, 16);
        const text = String(packet.text || "").slice(0, 140);
        const senderRole = packet.role === "W" ? "W" : "B";
        document.getElementById("typingIndicator").textContent = "";
        if (text) {
          playChatSound();
          appendChatLine(sender, text, senderRole);
        }
        return;
      }

      packetQueue.push(packet);
      processNextStatePacket();
    });
  }

  function processNextStatePacket() {
    if (isProcessingPacket || packetQueue.length === 0) return;
    isProcessingPacket = true;

    const packet = packetQueue.shift();
    const incoming = packet.type === "STATE" ? packet.state : packet;

    if (!incoming || !Array.isArray(incoming.points) || incoming.points.length !== 24) {
      isProcessingPacket = false;
      processNextStatePacket();
      return;
    }

    if (!Array.isArray(incoming.dice) || incoming.dice.length > 4 || incoming.dice.some(d => !Number.isInteger(d) || d < 1 || d > 6)) {
      isProcessingPacket = false;
      processNextStatePacket();
      return;
    }

    const prevTurn = state.turn;
    const animInfo = incoming.lastMoveAnim;
    const shouldAnimateMove =
      (incoming.lastAction === "MOVE" || incoming.lastAction === "HIT" || incoming.lastAction === "WIN") &&
      animInfo &&
      animInfo.from !== undefined &&
      animInfo.to !== undefined;

    const finishPacketStep = () => {
      isProcessingPacket = false;
      processNextStatePacket();
    };

    const applyIncomingState = () => {
      state = incoming;
      turnHistory = [];
      selectedFrom = null;
      validTargets = [];
      updateHeaderLabels();
      saveActiveRoomBackup();

      if (state.lastWinEvent) {
        recordWinEventToDatabase(state.lastWinEvent);
      }

      if (state.phase === "SET_OVER" && state.lastSetSummary) {
        clearActiveRoomBackup();
        playWinFanfare();
        render();
        showSetVictoryModal(state.lastSetSummary);
        finishPacketStep();
        return;
      }

      if (state.lastAction === "ROLL_OFF") {
        const rolledSide = state.rollOff.B !== null ? "B" : "W";
        animateBoardRollOffDie(rolledSide, () => {
          if (state.rollOff.W !== null && state.rollOff.B !== null) {
            resolveRollOffOutcome();
          } else if (state.turn === myRole) {
            setStatus(t().rolled1DieYourTurn(playerNames.W, state.rollOff.W));
            playTurnChime();
          }
          finishPacketStep();
        });
      } else if (state.lastAction === "ROLL") {
        animateDiceRoll(2, () => {
          finishPacketStep();
        });
      } else {
        if (state.lastAction === "MOVE" || state.lastAction === "UNDO") playCheckerClack(false);
        if (state.lastAction === "HIT") playCheckerClack(true);
        if (state.lastAction === "WIN") {
          playWinFanfare();
          if (state.turn === myRole) checkTriggerAutoRollOrAI();
        }
        if ((state.lastAction === "END_TURN" || prevTurn !== state.turn) && state.turn === myRole) {
          playTurnChime();
          checkTriggerAutoRollOrAI();
        }
        render();
        finishPacketStep();
      }
    };

    if (shouldAnimateMove) {
      animateCheckerTransition(animInfo.from, animInfo.to, animInfo.player, applyIncomingState);
    } else {
      applyIncomingState();
    }
  }

  function notifyLeavingTab() {
    saveActiveRoomBackup();
    if (conn && conn.open) {
      try { conn.send({ type: "BYE" }); } catch (_) {}
      try { conn.close(); } catch (_) {}
    }
  }
  window.addEventListener("beforeunload", notifyLeavingTab);
  window.addEventListener("pagehide", notifyLeavingTab);

  function syncState() {
    saveActiveRoomBackup();
    if (conn && conn.open) {
      conn.send({ type: "STATE", state: cloneState(state) });
    }
  }

  function handleChatTyping() {
    if (!conn || !conn.open) return;
    const val = document.getElementById("chatInput").value.trim();
    conn.send({ type: "TYPING", isTyping: val.length > 0 });
    if (localTypingTimeout) clearTimeout(localTypingTimeout);
    localTypingTimeout = setTimeout(() => {
      if (conn && conn.open) conn.send({ type: "TYPING", isTyping: false });
    }, 1800);
  }

  function sendChat() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    if (localTypingTimeout) clearTimeout(localTypingTimeout);
    const myColorRole = myRole === "B" ? "B" : "W";
    appendChatLine(myPlayerName, text, myColorRole);
    if (conn && conn.open) {
      conn.send({ type: "TYPING", isTyping: false });
      conn.send({ type: "CHAT", sender: myPlayerName, role: myColorRole, text });
    }
  }

  function appendChatLine(sender, text, role = "W") {
    const box = document.getElementById("chatMessages");
    const line = document.createElement("div");
    line.className = "chat-line";

    const nameSpan = document.createElement("span");
    nameSpan.className = "chat-sender";
    if (role === "SYS") {
      nameSpan.style.color = "#81c784";
    } else {
      const cId = role === "B" ? state.colors.B : state.colors.W;
      nameSpan.style.color = getColorMeta(cId).chatHex;
    }
    nameSpan.textContent = `${sender}:`;

    const msgSpan = document.createElement("span");
    msgSpan.textContent = ` ${text}`;

    line.appendChild(nameSpan);
    line.appendChild(msgSpan);
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.TavliDB.onRemoteUpdate(() => {
      handleNameInputCheck();
      if (document.getElementById("leaderboardModal").style.display === "flex") {
        renderLeaderboardModalContent();
      }
      if (document.getElementById("profileModal").style.display === "flex") {
        renderProfileModalContent();
      }
    });

    const savedTheme = localStorage.getItem("tavli_theme");
    if (savedTheme) selectTheme(savedTheme);

    const savedLang = localStorage.getItem("tavli_lang");
    if (savedLang === "el" || savedLang === "en") {
      selectLangPref(savedLang);
    } else {
      selectLangPref("en");
    }

    const savedStore = localStorage.getItem("tavli_store_enabled");
    if (savedStore !== null) {
      selectStoreDetailsPref(savedStore === "1");
    } else {
      selectStoreDetailsPref(true);
    }

    const savedColor = localStorage.getItem("tavli_player_color");
    if (savedColor && CHECKER_COLORS.some(c => c.id === savedColor)) {
      myChosenColor = savedColor;
    }

    const savedEndTurn = localStorage.getItem("tavli_end_turn_pref");
    if (savedEndTurn !== null) selectEndTurnPref(savedEndTurn === "1");

    const savedAutoRoll = localStorage.getItem("tavli_auto_roll_pref");
    if (savedAutoRoll !== null) selectAutoRollPref(savedAutoRoll === "1");

    const savedTarget = parseInt(localStorage.getItem("tavli_target_score"), 10);
    if (ALLOWED_TARGETS.includes(savedTarget)) myTargetScorePref = savedTarget;

    const savedMode = localStorage.getItem("tavli_game_mode");
    if (["FULL", "PORTES", "PLAKOTO", "FEVGA"].includes(savedMode)) {
      selectGameMode(savedMode);
    }

    const recentBackup = getActiveRoomBackup();
    if (recentBackup && recentBackup.roomCode) {
      document.getElementById("modalRoomInput").value = recentBackup.roomCode;
    }

    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl && roomFromUrl.trim().length === 6) {
      pendingRoomFromUrl = roomFromUrl.trim().toUpperCase();
      document.getElementById("modalRoomInput").value = pendingRoomFromUrl;
    }

    // Check persistent login and render landing
    checkPersistentLoginSession();
    handleNameInputCheck();
    renderColorPicker();
    renderTargetScorePicker();
    showScreen("LANDING");
  });

  function setStatus(msg) {
    const el = document.getElementById("statusLog");
    if (el) el.textContent = msg;
  }

  const PIP_MAP = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  function createDieEl(val, tumbling = false, isUsed = false, playerRole = null) {
    const roleForColor = playerRole || state.turn || "W";
    const checkerColorId = (state.colors && state.colors[roleForColor]) ? state.colors[roleForColor] : "white";
    const die = document.createElement("div");
    die.className =
      "die" +
      ` die-border-${checkerColorId}` +
      (tumbling ? " tumbling" : "") +
      (isUsed ? " used" : "");

    const activeCells = PIP_MAP[val] || [];
    for (let cell = 0; cell < 9; cell++) {
      const slot = document.createElement("div");
      if (activeCells.includes(cell)) slot.className = "pip";
      die.appendChild(slot);
    }
    return die;
  }

  function renderDiceAreas() {
    const leftZone = document.getElementById("rollOffLeftZone");
    const rightZone = document.getElementById("rollOffRightZone");

    leftZone.innerHTML = "";
    rightZone.innerHTML = "";

    if (state.phase === "ROLL_OFF") {
      if (state.rollOff.W !== null) {
        leftZone.appendChild(createDieEl(state.rollOff.W, false, false, "W"));
      }
      if (state.rollOff.B !== null) {
        rightZone.appendChild(createDieEl(state.rollOff.B, false, false, "B"));
      }
      return;
    }

    const pair = state.displayDice || [];
    if (pair.length === 0) return;

    const activePlayer = state.turn;
    if (pair.length === 2 && pair[0] === pair[1]) {
      const rem = state.dice.length;
      const used1 = rem <= 2;
      const used2 = rem === 0;
      leftZone.appendChild(createDieEl(pair[0], false, used1, activePlayer));
      rightZone.appendChild(createDieEl(pair[1], false, used2, activePlayer));
    } else {
      const remCopy = [...state.dice];
      pair.forEach((d, idx) => {
        const targetZone = idx === 0 ? leftZone : rightZone;
        const matchIdx = remCopy.indexOf(d);
        if (matchIdx > -1) {
          remCopy.splice(matchIdx, 1);
          targetZone.appendChild(createDieEl(d, false, false, activePlayer));
        } else {
          targetZone.appendChild(createDieEl(d, false, true, activePlayer));
        }
      });
    }
  }

  function render() {
    const v = currentVariant();
    const tr = t();
    document.getElementById("scoreW").textContent = state.scoreW;
    document.getElementById("scoreB").textContent = state.scoreB;
    document.getElementById("targetW").textContent = state.targetScore || 7;
    document.getElementById("targetB").textContent = state.targetScore || 7;
    document.getElementById("gameTitle").textContent = tr.variants[v] || v;

    const isMyTurn = (myRole === "BOTH" && !isAiMatch) || myRole === state.turn;
    const cLabelW = getColorMeta(state.colors.W).label;
    const cLabelB = getColorMeta(state.colors.B).label;
    const pName = state.turn === "W" ? `${cLabelW} (${playerNames.W})` : `${cLabelB} (${playerNames.B})`;
    const turnDone = state.phase === "PLAY" && state.rolled && (state.dice.length === 0 || !hasAnyLegalMove(state.turn));

    // Item 3: Fevga temporary block warning banner check
    const fevgaWarn = document.getElementById("fevgaPrimeWarning");
    if (fevgaWarn) {
      if (v === "FEVGA" && state.phase === "PLAY" && state.rolled && isFevgaStartingPrimeOccupied(state, state.turn) && state.dice.length > 0) {
        fevgaWarn.style.display = "block";
      } else {
        fevgaWarn.style.display = "none";
      }
    }

    if (state.phase === "ROLL_OFF") {
      document.getElementById("turnText").textContent = tr.roll1DieTurn(pName);
    } else if (!state.rolled) {
      document.getElementById("turnText").textContent = tr.toRoll(pName);
    } else if (turnDone && state.requireEndTurn) {
      document.getElementById("turnText").textContent = tr.tapEndTurn(pName);
    } else {
      document.getElementById("turnText").textContent = tr.moveCheckers(pName, state.dice.length);
    }

    const rollBtn = document.getElementById("rollBtn");
    rollBtn.style.display = (state.autoRoll && state.phase === "PLAY") ? "none" : "inline-block";
    rollBtn.disabled = state.phase === "SET_OVER" || isWaitingForReconnect || state.rolled || isAnimatingDice || isAnimatingChecker || !isMyTurn;

    document.getElementById("undoBtn").disabled = state.phase !== "PLAY" || isWaitingForReconnect || !state.rolled || isAnimatingDice || isAnimatingChecker || !isMyTurn || turnHistory.length === 0;
    document.getElementById("resignBtn").disabled = state.phase !== "PLAY" || isWaitingForReconnect || isAnimatingDice || isAnimatingChecker;

    const endBtn = document.getElementById("endTurnBtn");
    endBtn.style.display = state.requireEndTurn ? "inline-block" : "none";
    endBtn.disabled = !turnDone || isWaitingForReconnect || isAnimatingDice || isAnimatingChecker || !isMyTurn || isFevgaStartingPrimeOccupied(state, state.turn);
    if (!endBtn.disabled && state.requireEndTurn) {
      endBtn.classList.add("ready-pulse");
    } else {
      endBtn.classList.remove("ready-pulse");
    }

    if (!isAnimatingDice) renderDiceAreas();

    const tl = document.getElementById("top-left");
    const trEl = document.getElementById("top-right");
    const bl = document.getElementById("bottom-left");
    const br = document.getElementById("bottom-right");
    tl.innerHTML = ""; trEl.innerHTML = ""; bl.innerHTML = ""; br.innerHTML = "";

    const isBlackView = (myRole === "B");

    if (!isBlackView) {
      for (let i = 11; i >= 6; i--) tl.appendChild(renderPoint(i));
      for (let i = 5; i >= 0; i--) trEl.appendChild(renderPoint(i));
      for (let i = 12; i <= 17; i++) bl.appendChild(renderPoint(i));
      for (let i = 18; i <= 23; i++) br.appendChild(renderPoint(i));

      renderBarSlot("barTop", "W");
      renderBarSlot("barBottom", "B");

      if (v === "PLAKOTO") {
        renderOffSlot("offTop", "W");
        renderOffSlot("offBottom", "B");
      } else {
        renderOffSlot("offTop", "B");
        renderOffSlot("offBottom", "W");
      }
    } else {
      if (v === "PORTES" || v === "PLAKOTO") {
        for (let i = 12; i <= 17; i++) tl.appendChild(renderPoint(i));
        for (let i = 18; i <= 23; i++) trEl.appendChild(renderPoint(i));
        for (let i = 11; i >= 6; i--) bl.appendChild(renderPoint(i));
        for (let i = 5; i >= 0; i--) br.appendChild(renderPoint(i));
      } else {
        for (let i = 23; i >= 18; i--) tl.appendChild(renderPoint(i));
        for (let i = 17; i >= 12; i--) trEl.appendChild(renderPoint(i));
        for (let i = 0; i <= 5; i++) bl.appendChild(renderPoint(i));
        for (let i = 6; i <= 11; i++) br.appendChild(renderPoint(i));
      }

      renderBarSlot("barTop", "B");
      renderBarSlot("barBottom", "W");

      if (v === "PLAKOTO") {
        renderOffSlot("offTop", "B");
        renderOffSlot("offBottom", "W");
      } else {
        renderOffSlot("offTop", "W");
        renderOffSlot("offBottom", "B");
      }
    }
  }

  function renderPoint(idx) {
    const el = document.createElement("div");
    el.className = "point";
    el.setAttribute("data-pt-idx", idx);
    if (selectedFrom === idx) el.classList.add("selected");

    const targetMove = validTargets.find(m => m.to === idx);
    if (targetMove) {
      el.classList.add("valid-dest");
      const badge = document.createElement("div");
      badge.className = "dest-badge";
      badge.textContent = targetMove.badge;
      el.appendChild(badge);
    }
    el.onclick = () => handlePointClick(idx);

    const pt = state.points[idx];
    if (pt.count > 0) {
      if (pt.pinned) {
        const trappedColor = state.colors[pt.pinned];
        const trappedChk = document.createElement("div");
        trappedChk.className = `checker clr-${trappedColor} pinned-base`;
        el.appendChild(trappedChk);
      }

      const ownerColor = state.colors[pt.owner];
      const maxVisible = pt.pinned ? 4 : 5;
      const shown = Math.min(pt.count, maxVisible);
      for (let c = 0; c < shown; c++) {
        const chk = document.createElement("div");
        chk.className = `checker clr-${ownerColor}`;
        if (pt.pinned && c === 0) chk.classList.add("capturing-top");
        chk.style.zIndex = String(c + 3);
        if (c === shown - 1 && pt.count > maxVisible) chk.textContent = pt.count;
        el.appendChild(chk);
      }
    }
    return el;
  }

  function renderBarSlot(elementId, owner) {
    const el = document.getElementById(elementId);
    el.innerHTML = "";
    el.className = "slot-box";
    el.setAttribute("data-bar-owner", owner);
    el.onclick = () => selectBar(owner);
    if (selectedFrom === "BAR" && state.turn === owner) el.classList.add("selected");
    const count = state.bar[owner];
    if (count > 0) {
      const ownerColor = state.colors[owner];
      const chk = document.createElement("div");
      chk.className = `checker clr-${ownerColor}`;
      chk.style.width = "30px";
      chk.textContent = count;
      el.appendChild(chk);
    }
  }

  function renderOffSlot(elementId, owner) {
    const el = document.getElementById(elementId);
    el.innerHTML = "";
    el.className = "slot-box";
    el.setAttribute("data-off-owner", owner);
    const offMove = validTargets.find(m => m.to === "OFF");
    if (offMove && state.turn === owner) {
      el.classList.add("valid-dest");
      const badge = document.createElement("div");
      badge.className = "dest-badge";
      badge.textContent = offMove.badge;
      el.appendChild(badge);
    }
    const count = state.off[owner];
    if (count > 0) {
      const ownerColor = state.colors[owner];
      const chk = document.createElement("div");
      chk.className = `checker clr-${ownerColor}`;
      chk.style.width = "30px";
      chk.textContent = count;
      el.appendChild(chk);
    }
  }

  initGame("ROLL_OFF");