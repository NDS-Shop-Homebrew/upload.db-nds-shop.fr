import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Lang = "fr" | "en";

const DICT: Record<string, { fr: string; en: string }> = {
  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------
  "nav.dashboard": { fr: "Dashboard", en: "Dashboard" },
  "nav.games": { fr: "Jeux", en: "Games" },
  "nav.users": { fr: "Utilisateurs", en: "Users" },
  "nav.stats": { fr: "Statistiques", en: "Statistics" },
  "nav.settings": { fr: "Réglages", en: "Settings" },
  "nav.logout": { fr: "Déconnexion", en: "Logout" },
  "nav.team": { fr: "Équipe", en: "Team" },
  "nav.build": { fr: "Build", en: "Build" },
  "nav.backoffice": { fr: "Back-office", en: "Back-office" },
  "nav.menu": { fr: "Menu", en: "Menu" },
  // Ajoutées lors de la migration précédente — vérifier si ces pages existent réellement dans l'app
  "nav.forwarders": { fr: "Forwarders", en: "Forwarders" },
  "nav.screenshots": { fr: "Screenshots", en: "Screenshots" },
  "nav.requests": { fr: "Demandes", en: "Requests" },
  "nav.blacklist": { fr: "Blacklist", en: "Blacklist" },

  "app.title": { fr: "NDS-Shop Upload", en: "NDS-Shop Upload" },

  // ---------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------
  "login.title": { fr: "Connexion", en: "Sign in" },
  "login.subtitle": {
    fr: "Connectez-vous pour accéder au back-office.",
    en: "Sign in to access the back-office.",
  },
  "login.tagline": {
    fr: "Espace d'administration du site NDS-Shop.",
    en: "NDS-Shop website administration area.",
  },
  "login.adminTitle": { fr: "Administration", en: "Administration" },
  "login.username": { fr: "Identifiant", en: "Username" },
  "login.usernamePh": { fr: "Votre identifiant", en: "Your username" },
  "login.password": { fr: "Mot de passe", en: "Password" },
  "login.passwordPh": { fr: "••••••••", en: "••••••••" },
  "login.error": { fr: "Identifiants incorrects", en: "Invalid credentials" },
  "login.serverError": {
    fr: "Erreur de connexion au serveur",
    en: "Connection error",
  },
  "login.loading": { fr: "Connexion en cours...", en: "Signing in..." },
  // Les deux variantes du libellé bouton sont gardées : selon ce qu'utilise chaque composant
  "login.button": { fr: "Se connecter", en: "Sign in" },
  "login.submit": { fr: "Connexion", en: "Sign in" },
  "login.reserved": {
    fr: "Accès réservé à l'équipe NDS-Shop",
    en: "Restricted to NDS-Shop team",
  },
  "login.remember": { fr: "Se souvenir de moi", en: "Remember me" },
  "login.showPassword": { fr: "Afficher le mot de passe", en: "Show password" },
  "login.hidePassword": { fr: "Masquer le mot de passe", en: "Hide password" },

  // ---------------------------------------------------------------------
  // Requests (demandes de jeux)
  // ---------------------------------------------------------------------
  "requests.title": { fr: "Demandes de jeux", en: "Game requests" },
  "requests.subtitle": {
    fr: "Demandes en attente depuis le site public.",
    en: "Pending requests from the public site.",
  },
  "requests.refresh": { fr: "Rafraîchir", en: "Refresh" },
  "requests.systemsCol": { fr: "Systèmes", en: "Systems" },
  "requests.requesterCol": { fr: "Demandeur", en: "Requester" },
  "requests.dateCol": { fr: "Date", en: "Date" },
  "requests.votesCol": { fr: "Votes", en: "Votes" },
  "requests.delete": { fr: "Supprimer", en: "Delete" },
  "requests.confirmDelete": {
    fr: "Supprimer cette demande ?",
    en: "Delete this request?",
  },
  "requests.deleted": { fr: "Demande supprimée", en: "Request deleted" },
  "requests.empty": {
    fr: "Aucune demande en attente.",
    en: "No pending requests.",
  },
  "requests.anonymous": { fr: "Anonyme", en: "Anonymous" },
  // Ajoutées lors de la migration précédente — vérifier si ce workflow approve/reject existe réellement
  "requests.status": { fr: "Statut", en: "Status" },
  "requests.requestedBy": { fr: "Demandé par", en: "Requested by" },
  "requests.date": { fr: "Date", en: "Date" },
  "requests.actions": { fr: "Actions", en: "Actions" },
  "requests.approve": { fr: "Approuver", en: "Approve" },
  "requests.reject": { fr: "Rejeter", en: "Reject" },
  "requests.pending": { fr: "En attente", en: "Pending" },
  "requests.approved": { fr: "Approuvé", en: "Approved" },
  "requests.rejected": { fr: "Rejeté", en: "Rejected" },

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------
  "dashboard.title": { fr: "Dashboard", en: "Dashboard" },
  "dashboard.greeting": { fr: "Bonjour", en: "Hello" },
  "dashboard.role": { fr: "rôle", en: "role" },
  "dashboard.refresh": { fr: "Rafraîchir", en: "Refresh" },
  "dashboard.lastBuild": { fr: "Dernier build", en: "Last build" },
  "dashboard.noBuild": { fr: "Aucun build effectué", en: "No build yet" },
  "dashboard.success": { fr: "Succès", en: "Success" },
  "dashboard.failed": { fr: "Échec", en: "Failed" },
  "dashboard.viewLog": { fr: "Voir le log", en: "View log" },
  "dashboard.games": { fr: "Jeux", en: "Games" },
  "dashboard.users": { fr: "Utilisateurs", en: "Users" },
  "dashboard.forwarders": { fr: "Forwarders", en: "Forwarders" },
  "dashboard.screenshots": { fr: "Screenshots", en: "Screenshots" },
  "dashboard.downloads": { fr: "Téléchargements", en: "Downloads" },
  "dashboard.today": { fr: "Aujourd'hui", en: "Today" },
  "dashboard.topDownloads": {
    fr: "Top téléchargements (30 jours)",
    en: "Top downloads (30 days)",
  },
  "dashboard.statsError": {
    fr: "Erreur de chargement des statistiques",
    en: "Error loading statistics",
  },
  "dashboard.roms": { fr: "ROMs uploadées", en: "Uploaded ROMs" },
  "dashboard.incomplete": { fr: "Jeux incomplets", en: "Incomplete games" },
  "dashboard.noRom": { fr: "Sans ROM", en: "No ROM" },
  "dashboard.noIcon": { fr: "Sans icône", en: "No icon" },
  "dashboard.noBoxart": { fr: "Sans boxart", en: "No boxart" },
  "dashboard.last7": {
    fr: "Téléchargements — 7 derniers jours",
    en: "Downloads — last 7 days",
  },
  "dashboard.downloads14": {
    fr: "Téléchargements — 14 derniers jours",
    en: "Downloads — last 14 days",
  },
  "dashboard.recentGames": {
    fr: "Jeux récemment ajoutés",
    en: "Recently added games",
  },
  "dashboard.updated": { fr: "mis à jour", en: "updated" },
  "dashboard.nds": { fr: "NDS", en: "NDS" },
  "dashboard.cia": { fr: "CIA", en: "CIA" },
  "dashboard.seeStats": { fr: "Toutes les stats →", en: "All stats →" },
  // Ajoutée lors de la migration précédente — doublon possible avec seeStats, vérifier lequel est utilisé
  "dashboard.seeDetails": { fr: "Voir détails", en: "See details" },

  // ---------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------
  "stats.title": { fr: "Statistiques détaillées", en: "Detailed statistics" },
  "stats.subtitle": {
    fr: "Évolution des téléchargements, répartitions du catalogue et activité.",
    en: "Download trends, catalog breakdown and activity.",
  },
  "stats.refresh": { fr: "Rafraîchir", en: "Refresh" },
  "stats.statsError": {
    fr: "Erreur de chargement des statistiques",
    en: "Error loading statistics",
  },
  "stats.games": { fr: "Jeux", en: "Games" },
  "stats.users": { fr: "Utilisateurs", en: "Users" },
  "stats.totalDownloads": {
    fr: "Téléchargements (30 j)",
    en: "Downloads (30 d)",
  },
  "stats.nds": { fr: "NDS", en: "NDS" },
  "stats.cia": { fr: "CIA", en: "CIA" },
  "stats.downloads": { fr: "Téléchargements", en: "Downloads" },
  "stats.downloads30": {
    fr: "Téléchargements — 30 derniers jours",
    en: "Downloads — last 30 days",
  },
  "stats.topGames": {
    fr: "Top jeux téléchargés (30 jours)",
    en: "Top downloaded games (30 days)",
  },
  "stats.byVersion": {
    fr: "Jeux par version / région",
    en: "Games by version / region",
  },
  "stats.bySystem": { fr: "Jeux par système", en: "Games by system" },
  "stats.byCategory": { fr: "Jeux par catégorie", en: "Games by category" },
  "stats.gamesByMonth": {
    fr: "Jeux ajoutés par mois",
    en: "Games added per month",
  },
  "stats.usersByMonth": { fr: "Utilisateurs par mois", en: "Users per month" },
  "stats.cat.game": { fr: "Jeu", en: "Game" },
  "stats.cat.homebrew": { fr: "Homebrew", en: "Homebrew" },
  "stats.cat.emulator": { fr: "Émulateur", en: "Emulator" },
  // Ajoutées lors de la migration précédente — vérifier si ce découpage période existe réellement
  "stats.period": { fr: "Période", en: "Period" },
  "stats.day": { fr: "Jour", en: "Day" },
  "stats.week": { fr: "Semaine", en: "Week" },
  "stats.month": { fr: "Mois", en: "Month" },
  "stats.year": { fr: "Année", en: "Year" },
  "stats.uniqueUsers": { fr: "Utilisateurs uniques", en: "Unique users" },
  "stats.byRegion": { fr: "Par région", en: "By region" },
  "stats.byGenre": { fr: "Par genre", en: "By genre" },

  // ---------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------
  "users.title": { fr: "Utilisateurs", en: "Users" },
  "users.subtitle": {
    fr: "Gérez les comptes de l'équipe.",
    en: "Manage team accounts.",
  },
  "users.create": { fr: "Créer un compte", en: "Create account" },
  "users.createTitle": { fr: "Créer un utilisateur", en: "Create user" },
  "users.username": { fr: "Identifiant", en: "Username" },
  "users.password": { fr: "Mot de passe", en: "Password" },
  "users.name": { fr: "Nom complet", en: "Full name" },
  "users.email": { fr: "Email", en: "Email" },
  "users.role": { fr: "Rôle", en: "Role" },
  "users.status": { fr: "Statut", en: "Status" },
  "users.active": { fr: "Actif", en: "Active" },
  "users.banned": { fr: "Banni", en: "Banned" },
  "users.actions": { fr: "Actions", en: "Actions" },
  "users.edit": { fr: "Modifier", en: "Edit" },
  "users.setPassword": { fr: "Mot de passe", en: "Password" },
  "users.ban": { fr: "Bannir", en: "Ban" },
  "users.unban": { fr: "Débannir", en: "Unban" },
  "users.delete": { fr: "Supprimer", en: "Delete" },
  "users.created": { fr: "Utilisateur créé", en: "User created" },
  "users.updated": { fr: "Infos mises à jour", en: "Info updated" },
  "users.passwordUpdated": {
    fr: "Mot de passe mis à jour",
    en: "Password updated",
  },
  "users.deleted": { fr: "Utilisateur supprimé", en: "User deleted" },
  "users.confirmDelete": {
    fr: "Supprimer définitivement",
    en: "Permanently delete",
  },
  "users.cannotDeleteSelf": {
    fr: "Vous ne pouvez pas supprimer votre propre compte.",
    en: "You cannot delete your own account.",
  },
  "users.cannotBanSelf": {
    fr: "Vous ne pouvez pas bannir votre propre compte.",
    en: "You cannot ban your own account.",
  },
  "users.search": { fr: "Rechercher un utilisateur…", en: "Search user…" },
  "users.noResults": { fr: "Aucun utilisateur trouvé.", en: "No user found." },
  "users.newPassword": { fr: "Nouveau mot de passe", en: "New password" },
  "users.save": { fr: "Enregistrer", en: "Save" },
  "users.cancel": { fr: "Annuler", en: "Cancel" },
  // Ajoutées lors de la migration précédente
  "users.add": { fr: "Ajouter un utilisateur", en: "Add user" },
  "users.admin": { fr: "Admin", en: "Admin" },
  "users.inactive": { fr: "Inactif", en: "Inactive" },
  "users.user": { fr: "Utilisateur", en: "User" },
  "users.noUsers": { fr: "Aucun utilisateur trouvé", en: "No users found" },
  "users.passwordPh": {
    fr: "Laisser vide pour ne pas changer",
    en: "Leave empty to keep unchanged",
  },

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  "settings.title": { fr: "Paramètres", en: "Settings" },
  "settings.subtitle": {
    fr: "Gérez votre profil, vos préférences et votre mot de passe.",
    en: "Manage your profile, preferences and password.",
  },
  "settings.profile": { fr: "Profil", en: "Profile" },
  "settings.username": { fr: "Identifiant", en: "Username" },
  "settings.usernameNote": {
    fr: "Ne peut pas être changé.",
    en: "Cannot be changed.",
  },
  "settings.name": { fr: "Nom complet", en: "Full name" },
  "settings.namePh": { fr: "Votre nom complet", en: "Your full name" },
  "settings.email": { fr: "Email", en: "Email" },
  "settings.emailNote": {
    fr: "Fixé pour sécurité.",
    en: "Fixed for security.",
  },
  "settings.changePassword": {
    fr: "Changer le mot de passe",
    en: "Change password",
  },
  "settings.currentPassword": {
    fr: "Mot de passe actuel",
    en: "Current password",
  },
  "settings.newPassword": { fr: "Nouveau mot de passe", en: "New password" },
  "settings.confirmPassword": {
    fr: "Confirmer le mot de passe",
    en: "Confirm password",
  },
  "settings.passwordMismatch": {
    fr: "Les mots de passe ne correspondent pas.",
    en: "Passwords do not match.",
  },
  "settings.save": { fr: "Enregistrer", en: "Save" },
  "settings.passwordChanged": {
    fr: "Mot de passe changé avec succès.",
    en: "Password changed successfully.",
  },
  "settings.preferences": { fr: "Préférences", en: "Preferences" },
  "settings.darkMode": { fr: "Mode sombre", en: "Dark mode" },
  "settings.language": { fr: "Langue", en: "Language" },
  "settings.saved": { fr: "Enregistré.", en: "Saved." },
  // Ajoutées lors de la migration précédente
  "settings.appearance": { fr: "Apparence", en: "Appearance" },
  "settings.system": { fr: "Système", en: "System" },
  "settings.notifications": { fr: "Notifications", en: "Notifications" },

  // ---------------------------------------------------------------------
  // Team
  // ---------------------------------------------------------------------
  "team.title": { fr: "Équipe", en: "Team" },
  "team.subtitle": {
    fr: "Sélectionnez les membres Discord affichés sur la page À propos.",
    en: "Select the Discord members shown on the About page.",
  },
  "team.save": { fr: "Enregistrer", en: "Save" },
  "team.refresh": { fr: "Actualiser", en: "Refresh" },
  "team.saved": { fr: "Équipe sauvegardée", en: "Team saved" },
  "team.search": { fr: "Rechercher un membre…", en: "Search member…" },
  "team.members": { fr: "membres", en: "members" },
  "team.online": { fr: "en ligne", en: "online" },
  "team.teamBadge": { fr: "Équipe", en: "Team" },
  "team.loading": { fr: "Chargement…", en: "Loading…" },
  "team.noMembers": {
    fr: "Aucun membre trouvé (vérifier le token Discord côté serveur).",
    en: "No member found (check the Discord token server-side).",
  },
  "team.noResults": { fr: "Aucun résultat.", en: "No results." },

  // ---------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------
  "build.title": { fr: "Build", en: "Build" },
  "build.subtitle": {
    fr: "Lancez un build du site et suivez sa progression en temps réel.",
    en: "Launch a site build and follow its progress in real time.",
  },
  "build.about": { fr: "À propos du build", en: "About the build" },
  "build.aboutText": {
    fr: "Le build régénère automatiquement :",
    en: "The build automatically regenerates:",
  },
  "build.aboutIcons": {
    fr: "Les icônes extraites des ROMs",
    en: "Icons extracted from ROMs",
  },
  "build.aboutBoxarts": {
    fr: "Les boxarts et screenshots (libretro)",
    en: "Boxarts and screenshots (libretro)",
  },
  "build.aboutPages": {
    fr: "Les pages du site + games.json",
    en: "Site pages + games.json",
  },
  "build.aboutForwarders": {
    fr: "Les forwarders .cia (skippés si déjà générés)",
    en: ".cia forwarders (skipped if already generated)",
  },
  "build.launch": { fr: "Lancer le build", en: "Launch build" },
  "build.building": { fr: "Build en cours…", en: "Building…" },
  "build.launched": { fr: "Build lancé.", en: "Build launched." },
  "build.status": { fr: "Statut", en: "Status" },
  "build.noBuild": { fr: "Aucun build effectué.", en: "No build yet." },
  "build.success": { fr: "Succès", en: "Success" },
  "build.failed": { fr: "Échec", en: "Failed" },
  "build.log": { fr: "Log", en: "Log" },
  "build.viewLog": { fr: "Voir le log", en: "View log" },

  // ---------------------------------------------------------------------
  // Games
  // ---------------------------------------------------------------------
  "games.title": { fr: "Bibliothèque de jeux", en: "Game library" },
  "games.subtitle": {
    fr: "Gérez vos fichiers JSON et métadonnées.",
    en: "Manage your JSON files and metadata.",
  },
  "games.search": {
    fr: "Rechercher par titre ou auteur...",
    en: "Search by title or author...",
  },
  "games.add": { fr: "Ajouter un jeu", en: "Add game" },
  "games.sortBy": { fr: "Trier par", en: "Sort by" },
  "games.sortOrder": { fr: "Ordre", en: "Order" },
  "games.titleCol": { fr: "Titre", en: "Title" },
  "games.authorCol": { fr: "Auteur", en: "Author" },
  "games.updatedCol": { fr: "Mise à jour", en: "Updated" },
  "games.asc": { fr: "Croissant", en: "Ascending" },
  "games.desc": { fr: "Décroissant", en: "Descending" },
  "games.noResults": { fr: "Aucun jeu trouvé.", en: "No game found." },
  "games.noResultsHint": {
    fr: "Essayez de modifier votre recherche ou ajoutez un nouveau jeu.",
    en: "Try changing your search or add a new game.",
  },
  "games.edit": { fr: "Modifier", en: "Edit" },
  "games.loading": { fr: "Chargement…", en: "Loading…" },
  "games.delete": { fr: "Supprimer", en: "Delete" },
  // Ajoutées lors de la migration précédente — vérifier si ces champs (serial, wifi, players...) existent dans ton modèle de jeu
  "games.titleLabel": { fr: "Titre", en: "Title" },
  "games.serial": { fr: "Numéro de série", en: "Serial" },
  "games.region": { fr: "Région", en: "Region" },
  "games.languages": { fr: "Langues", en: "Languages" },
  "games.developer": { fr: "Développeur", en: "Developer" },
  "games.publisher": { fr: "Éditeur", en: "Publisher" },
  "games.releaseDate": { fr: "Date de sortie", en: "Release date" },
  "games.genre": { fr: "Genre", en: "Genre" },
  "games.players": { fr: "Joueurs", en: "Players" },
  "games.wifi": { fr: "WiFi", en: "WiFi" },
  "games.description": { fr: "Description", en: "Description" },
  "games.romFile": { fr: "Fichier ROM", en: "ROM file" },
  "games.iconFile": { fr: "Fichier icône", en: "Icon file" },
  "games.boxartFile": { fr: "Fichier boxart", en: "Boxart file" },
  "games.screenshots": { fr: "Screenshots", en: "Screenshots" },
  "games.save": { fr: "Enregistrer", en: "Save" },
  "games.cancel": { fr: "Annuler", en: "Cancel" },
  "games.romUploaded": { fr: "ROM uploadée", en: "ROM uploaded" },
  "games.iconUploaded": { fr: "Icône uploadée", en: "Icon uploaded" },
  "games.boxartUploaded": { fr: "Boxart uploadé", en: "Boxart uploaded" },
  "games.screenshotUploaded": {
    fr: "Screenshot uploadé",
    en: "Screenshot uploaded",
  },
  "games.fileTooLarge": {
    fr: "Fichier trop volumineux (max 100 Mo)",
    en: "File too large (max 100 MB)",
  },
  "games.invalidFile": {
    fr: "Type de fichier invalide",
    en: "Invalid file type",
  },
  "games.requiredField": { fr: "Champ requis", en: "Required field" },
  "games.noGames": { fr: "Aucun jeu trouvé", en: "No games found" },
  "games.confirmDelete": {
    fr: "Confirmer la suppression de ce jeu ?",
    en: "Confirm delete this game?",
  },

  // ---------------------------------------------------------------------
  // EditGame
  // ---------------------------------------------------------------------
  "edit.loading": {
    fr: "Chargement des données du jeu...",
    en: "Loading game data...",
  },
  "edit.back": { fr: "Retour à la liste", en: "Back to list" },
  "edit.new": { fr: "Nouveau Jeu", en: "New game" },
  "edit.edit": { fr: "Éditer:", en: "Edit:" },
  "edit.description": {
    fr: "Remplissez les métadonnées et uploadez les fichiers nécessaires.",
    en: "Fill in the metadata and upload the required files.",
  },
  "edit.title": { fr: "Titre du jeu *", en: "Game title *" },
  "edit.titlePh": {
    fr: "Ex: Pokémon Version Platine",
    en: "e.g. Pokémon Platinum Version",
  },
  "edit.author": { fr: "Auteur / Éditeur", en: "Author / Publisher" },
  "edit.authorPh": { fr: "Ex: Nintendo", en: "e.g. Nintendo" },
  "edit.titleId": { fr: "Title ID", en: "Title ID" },
  "edit.titleIdAuto": {
    fr: "Rempli automatiquement par l'analyse de la ROM.",
    en: "Auto-filled by the ROM analysis.",
  },
  "edit.categories": { fr: "Catégories", en: "Categories" },
  "edit.systems": { fr: "Systèmes compatibles", en: "Supported systems" },
  "edit.version": { fr: "Version / Région", en: "Version / Region" },
  "edit.files": { fr: "Fichiers & Assets", en: "Files & Assets" },
  "edit.romLabel": { fr: "ROM du jeu (.nds)", en: "Game ROM (.nds)" },
  "edit.iconAuto": { fr: "Icône", en: "Icon" },
  "edit.iconAutoText": {
    fr: "Extraite automatiquement de la ROM au build.",
    en: "Extracted automatically from the ROM at build.",
  },
  "edit.shotsAuto": { fr: "Screenshots", en: "Screenshots" },
  "edit.shotsAutoText": {
    fr: "Téléchargés automatiquement (libretro) au build.",
    en: "Downloaded automatically (libretro) at build.",
  },
  "edit.fwdAuto": { fr: "Forwarder (.cia)", en: "Forwarder (.cia)" },
  "edit.fwdAutoText": {
    fr: "Généré automatiquement à partir de la ROM au build.",
    en: "Generated automatically from the ROM at build.",
  },
  "edit.iconLabel": { fr: "Icône (1 seul)", en: "Icon (1 only)" },
  "edit.shotsLabel": {
    fr: "Screenshots (Multiples)",
    en: "Screenshots (Multiple)",
  },
  "edit.fwdLabel": { fr: "Forwarder (.cia)", en: "Forwarder (.cia)" },
  "edit.create": { fr: "Créer le jeu", en: "Create game" },
  "edit.update": { fr: "Mettre à jour", en: "Update" },
  "edit.analyzeFail": {
    fr: "Analyse ROM impossible",
    en: "ROM analysis failed",
  },
  "edit.loadFail": {
    fr: "Erreur lors du chargement du jeu",
    en: "Error loading game",
  },
  "edit.loadDataFail": { fr: "Erreur de chargement", en: "Loading error" },
  "edit.uploadFail": { fr: "Erreur upload", en: "Upload error" },
  "edit.titleRequired": {
    fr: "Le titre est obligatoire",
    en: "Title is required",
  },
  "edit.exists": { fr: "Ce jeu existe déjà", en: "This game already exists" },
  "edit.saved": {
    fr: "Jeu enregistré avec succès",
    en: "Game saved successfully",
  },
  "edit.saveFail": {
    fr: "Erreur lors de la sauvegarde",
    en: "Error while saving",
  },
  "edit.publisher": { fr: "Éditeur", en: "Publisher" },
  "edit.developer": { fr: "Développeur", en: "Developer" },
  "edit.genres": { fr: "Genres", en: "Genres" },
  "edit.genresHint": {
    fr: "Séparés par des virgules. Auto-remplis par l'analyse.",
    en: "Comma separated. Auto-filled by analysis.",
  },
  "edit.descLabel": { fr: "Description", en: "Description" },
  "edit.descHint": {
    fr: "Résumé du jeu. Auto-remplie via ndsdb si disponible.",
    en: "Game summary. Auto-filled via ndsdb when available.",
  },

  // ---------------------------------------------------------------------
  // NotFound
  // ---------------------------------------------------------------------
  "notFound.title": { fr: "404", en: "404" },
  "notFound.message": {
    fr: "Oups ! Page introuvable.",
    en: "Oops! Page not found.",
  },
  "notFound.description": {
    fr: "La page que vous recherchez n'existe pas, a été supprimée ou a été déplacée.",
    en: "The page you are looking for does not exist, was deleted or moved.",
  },
  "notFound.back": { fr: "Retour à l'accueil", en: "Back to home" },

  // ---------------------------------------------------------------------
  // Forwarders — ajoutées lors de la migration précédente, vérifier si cette page existe réellement
  // ---------------------------------------------------------------------
  "forwarders.title": { fr: "Forwarders", en: "Forwarders" },
  "forwarders.add": { fr: "Ajouter un forwarder", en: "Add forwarder" },
  "forwarders.edit": { fr: "Modifier", en: "Edit" },
  "forwarders.delete": { fr: "Supprimer", en: "Delete" },
  "forwarders.name": { fr: "Nom", en: "Name" },
  "forwarders.url": { fr: "URL", en: "URL" },
  "forwarders.enabled": { fr: "Activé", en: "Enabled" },
  "forwarders.disabled": { fr: "Désactivé", en: "Disabled" },

  // ---------------------------------------------------------------------
  // Screenshots — ajoutées lors de la migration précédente, vérifier si cette page existe réellement
  // ---------------------------------------------------------------------
  "screenshots.title": { fr: "Screenshots", en: "Screenshots" },
  "screenshots.add": { fr: "Ajouter screenshot", en: "Add screenshot" },
  "screenshots.edit": { fr: "Modifier", en: "Edit" },
  "screenshots.delete": { fr: "Supprimer", en: "Delete" },
  "screenshots.game": { fr: "Jeu", en: "Game" },
  "screenshots.image": { fr: "Image", en: "Image" },
  "screenshots.order": { fr: "Ordre", en: "Order" },

  // ---------------------------------------------------------------------
  // Blacklist — ajoutées lors de la migration précédente, vérifier si cette page existe réellement
  // ---------------------------------------------------------------------
  "blacklist.title": { fr: "Blacklist", en: "Blacklist" },
  "blacklist.add": { fr: "Ajouter à la blacklist", en: "Add to blacklist" },
  "blacklist.remove": { fr: "Retirer", en: "Remove" },
  "blacklist.ip": { fr: "Adresse IP", en: "IP address" },
  "blacklist.reason": { fr: "Raison", en: "Reason" },
  "blacklist.noEntries": { fr: "Aucune entrée", en: "No entries" },

  // ---------------------------------------------------------------------
  // Common — petits libellés génériques ajoutés lors de la migration précédente
  // ---------------------------------------------------------------------
  "common.save": { fr: "Enregistrer", en: "Save" },
  "common.cancel": { fr: "Annuler", en: "Cancel" },
  "common.delete": { fr: "Supprimer", en: "Delete" },
  "common.edit": { fr: "Modifier", en: "Edit" },
  "common.add": { fr: "Ajouter", en: "Add" },
  "common.search": { fr: "Rechercher", en: "Search" },
  "common.loading": { fr: "Chargement...", en: "Loading..." },
  "common.error": { fr: "Erreur", en: "Error" },
  "common.success": { fr: "Succès", en: "Success" },
  "common.confirm": { fr: "Confirmer", en: "Confirm" },
  "common.yes": { fr: "Oui", en: "Yes" },
  "common.no": { fr: "Non", en: "No" },
  "common.close": { fr: "Fermer", en: "Close" },
  "common.back": { fr: "Retour", en: "Back" },
  "common.next": { fr: "Suivant", en: "Next" },
  "common.previous": { fr: "Précédent", en: "Previous" },
};

interface UIContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  toggleDark: () => void;
  t: (key: string) => string;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem("botLang") as Lang) || "fr",
  );
  const [dark, setDark] = useState<boolean>(
    () => (localStorage.getItem("botDark") ?? "dark") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const setLang = (l: Lang) => {
    localStorage.setItem("botLang", l);
    setLangState(l);
  };

  const toggleDark = () => {
    const next = !dark;
    localStorage.setItem("botDark", next ? "dark" : "light");
    setDark(next);
  };

  const t = (key: string) => DICT[key]?.[lang] ?? key;

  return (
    <UIContext.Provider value={{ lang, setLang, dark, toggleDark, t }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
