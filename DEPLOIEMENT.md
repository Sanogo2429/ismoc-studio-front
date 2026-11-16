# Mise en ligne d'IsMoc Studio

Deux éléments à héberger : l'**API .NET 8** (`IsMocStudio`) et le **site React** (`ismoc-studio-front`, fichiers statiques).
Tout doit passer en **HTTPS** : la messagerie temps réel utilise alors automatiquement **WSS** (WebSocket chiffré).

## 1. API .NET (`IsMocStudio`)

### Secrets : variables d'environnement uniquement
Aucun secret n'est dans `appsettings.json`. En local ils sont dans les *User Secrets* (`dotnet user-secrets list`) ;
chez l'hébergeur, créez ces variables d'environnement (le `__` remplace le `:`) :

| Variable | Contenu |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Chaîne PostgreSQL, ex. `Host=<hote>;Port=5432;Database=<base>;Username=<utilisateur>;Password=<mot-de-passe>;SSL Mode=Require` (sur Render : base PostgreSQL → « Internal Database URL », convertie dans ce format) |
| `JwtSettings__Secret` | Clé aléatoire d'au moins 32 caractères (différente de celle du poste local) |
| `EmailSettings__SenderEmail` / `EmailSettings__SenderPassword` | Compte Gmail + mot de passe d'application |
| `Authentication__Google__ClientId` / `Authentication__Google__ClientSecret` | Identifiants OAuth Google |
| `Anthropic__ApiKey` / `OpenAI__ApiKey` | Clés des moteurs IA |
| `Cors__AllowedOrigins__0` | Adresse exacte du site, ex. `https://www.votre-domaine.fr` |
| `Frontend__BaseUrl` | Même adresse (retour après la connexion Google) |
| `AdminEmails__0` | `sanogomohamedismael47@gmail.com` |
| `BasicAuth__Username` / `BasicAuth__Password` | Accès à la documentation Swagger (racine de l'API). Mot de passe de 12 caractères minimum ; sans ces variables, Swagger est fermé (404) |

Générer une clé JWT : `python -c "import secrets; print(secrets.token_urlsafe(64))"`.

### Points à vérifier
- **Base de données (PostgreSQL)** : appliquer les migrations EF Core sur la base de production depuis le poste,
  avec l'« External Database URL » de Render :
  `dotnet ef database update --project IsMocStudio.Data/IsMocStudio.Data.csproj --startup-project IsMocStudio.api.csproj --connection "<chaîne>"`.
- **Dossier `App_Data/`** : conversations, pièces jointes et livrables y sont écrits → disque **persistant** et sauvegardé
  (jamais dans Git, déjà exclu par `.gitignore`).
- **Google Cloud Console** : ajouter `https://<adresse-de-l-api>/signin-google` aux URI de redirection autorisés.
- **Reverse proxy** (Azure App Service, Nginx, IIS) : l'API lit `X-Forwarded-For` / `X-Forwarded-Proto` ; activer les
  **WebSockets** chez l'hébergeur (sinon la messagerie retombe sur un mode plus lent).
- **Sonde de santé** : `GET /health` → `Healthy`.
- Swagger n'est **pas** exposé en production ; HSTS et en-têtes de sécurité sont actifs automatiquement.

## 2. Site React (`ismoc-studio-front`)

Hébergé sur **Vercel** (`https://ismoc-studio-front.vercel.app`), API sur **Render** (`https://ismoc-studio-api.onrender.com`).

1. `.env.production` (versionné, aucun secret) : `VITE_API_BASE_URL=https://ismoc-studio-api.onrender.com`.
   Une variable `VITE_API_BASE_URL` définie dans Vercel (Settings → Environment Variables) prime sur ce fichier.
2. `vercel.json` : build `npm run build` → `dist/`, **réécriture SPA** (`/dashboard`, `/admin`… → `index.html`),
   pas de cache pour le service worker (mises à jour de la PWA immédiates), cache long pour `assets/`.
3. CORS côté API : l'adresse Vercel est autorisée dans `appsettings.json` (`Cors:AllowedOrigins`, `Frontend:BaseUrl`).
   Nouveau domaine (ex. nom de domaine personnalisé) → l'ajouter via `Cors__AllowedOrigins__1` sur Render.
4. HTTPS obligatoire (sinon pas d'installation PWA, pas de caméra/micro pour les appels).

## 3. Application mobile (PWA)

Une fois le site en HTTPS :
- **Android (Chrome)** : menu ⋮ → **Installer l'application**.
- **iPhone (Safari)** : bouton Partager → **Sur l'écran d'accueil**.

L'application s'ouvre en plein écran avec l'icône IsMoc, sans passer par les stores.
Les données personnelles (messages, projets) ne sont jamais mises en cache hors ligne : seule l'interface l'est.
