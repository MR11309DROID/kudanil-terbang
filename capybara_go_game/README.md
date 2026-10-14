# 🦫 Capybara Go! — Web RPG Roguelike Production

Game mobile-adventure roguelike yang terinspirasi langsung dari **Capybara Go!** oleh Habby, dibangun menggunakan asset pack produksi lengkap (`capybara_go_complete_production_pack_v2_2.zip`).

---

## 🎮 Cara Menjalankan Game (Instan)

Kamu dapat langsung menjalankan game ini dengan **satu klik**:

1. Buka folder:  
   `C:\Users\ThinkPad\.gemini\antigravity\scratch\capybara_go_game`
2. Klik ganda (Double-click) pada file **`start_game.bat`**.
3. Server lokal PowerShell otomatis aktif dan browser default (seperti Microsoft Edge / Google Chrome) akan langsung terbuka ke alamat:  
   👉 **`http://localhost:8080/`**

> **Catatan:** Jangan tutup jendela command prompt `start_game.bat` selama sedang bermain agar server lokal terus berjalan melayani musik, audio, dan gambar.

---

## 🌟 Fitur & Mekanisme Game

### 1. Visual & Graphic Style
- **Mobile Portrait Display:** Tampilan khas mobile RPG responsif dengan frame bezel ponsel di desktop.
- **Parallax Scenery:** Latar pemandangan bergerak halus sesuai chapter yang dimainkan (Meadow Castle, Desert Ruins, Snow Mountain, Volcano Lava, Moonlit Castle).
- **Animasi Sprite Capybara (Frame-by-Frame):**
  - Gerakan dinamis: *Idle*, *Walk*, *Run*, *Attack*, *Skill/Ultimate*, *Hurt*, dan *Die*.
- **Partikel & Combat FX:**
  - Efek tebasan pedang (`fx_magic_slash.png`), percikan kritikal (`fx_critical_burst.png`), lingkaran heal (`fx_heal_ring.png`), perisai (`fx_shield_pulse.png`), efek beku (`fx_ice_shatter.png`), dan racun (`fx_poison_pulse.png`).
  - Angka damage melayang bervariasi (*Crit!*, *Heal*, *Dodge!*, *Block*).
- **Full Audio & SFX:**
  - Musik petualangan (`adventure_loop.wav`), musik pertempuran (`battle_loop.wav`), dan musik menu (`menu_loop.wav`).
  - Suara SFX lengkap untuk setiap tebasan, benturan, peti harta, level up, dan raungan boss.

### 2. Gameplay Loop (60 Hari Roguelike)
- **Struktur 60 Hari Per Chapter:** Setiap petualangan menuntut kamu bertahan hidup hingga Hari ke-60.
- **Milestone Boss Day:**
  - Hari 20: Mini-Boss Encounter 💀
  - Hari 40: Elite Boss Encounter ⚔️
  - Hari 60: Supreme Chapter Final Boss 👑 (misal: Supreme Capybara King)
- **Pertemuan Acak & Event Naratif:**
  - **Mata Air Suci:** Pulihkan HP atau dapatkan berkah serangan.
  - **Kuali Penyihir:** Pertaruhkan HP demi buff serangan & kritikal besar.
  - **Pedagang Pengelana:** Beli ramuan atau buku skill misterius dengan koin emas.
  - **Api Unggun Pengembara:** Panggang ubi manis untuk memulihkan energi dan menambah Max HP.
  - **Peti Harta Purba:** Buka peti dan dapatkan koin, permata, atau senjata langka!
  - **Dadu Goblin:** Uji keberuntungan melipatgandakan koin emas.
  - **Kebun Buah Yuzu Emas:** Berendam di onsen buah yuzu untuk memulihkan seluruh HP dan mengisi Rage 100%!
- **Rage & Ultimate Bar:** Bar Rage terisi saat menyerang dan menerima serangan. Saat 100%, Capybara otomatis melancarkan Ultimate Skill berkekuatan dahsyat!
- **Pilihan 3-Kartu Roguelike:** Saat naik level atau di altar suci, pilih 1 dari 3 berkah berkekuatan unik dari daftar 79 skill produksi lengkap.

### 3. Sistem Perkembangan Akun (Out-of-Run Growth)
- **Menu Hero & Paperdoll Equipment:**
  - 6 Slot Perlengkapan: *Weapon*, *Armor*, *Helmet*, *Boots*, *Ring*, *Amulet*.
  - Tingkat Kelangkaan: *Common*, *Uncommon*, *Rare*, *Epic*, *Legendary*.
  - Tingkatkan (Upgrade) level perlengkapan menggunakan Gold untuk menaikkan ATK, HP, DEF, Crit, Dodge, dan Lifesteal.
- **Pohon Bakat Permanen (Talents):**
  - *Capybara Might* (+ATK permanen)
  - *Sturdy Resilience* (+HP permanen)
  - *Thick Fur Armor* (+DEF permanen)
  - *Treasure Sniffer* (+Gold drop)
  - *Fiery Spirit* (+Initial Rage di awal run)
  - *Citrus Fortune* (+Peluang drop Epic/Legendary)
- **Gacha Peti Harta (Chests Vault):**
  - Buka *Wooden Chest* (Kunci / 150 Gold) & *Royal Golden Chest* (60 Gems) dengan animasi peti berguncang dan sinar emas memancar.
- **Bestiary & Codex:**
  - Katalog seluruh monster dan boss yang telah kamu kalahkan beserta statistik eliminasinya.

---

## 📁 Struktur Direktori Game

```
capybara_go_game/
├── index.html            # Antarmuka utama dan canvas game
├── styles.css            # Styling visual, 9-slice panel, frame mobile, animasi
├── server.ps1            # Server web lokal ringan PowerShell (Zero dependencies)
├── start_game.bat        # Launcher 1-klik untuk Windows
├── js/
│   ├── data.js           # Database chapter, monster, boss, 79 skills, item, talents, events
│   ├── audio.js          # Audio engine (BGM loop & SFX player)
│   ├── character.js      # Status hero, inventori, talents, penyimpanan lokal (localStorage)
│   ├── stage_renderer.js # Renderer Canvas HTML5 (Parallax, Animasi Capybara, Musuh, Partikel)
│   ├── battle_system.js  # Mesin pertempuran berbasis turn, rage ultimate, perhitungan stat
│   ├── adventure_engine.js # Mesin petualangan 60 hari roguelike & penjelajahan
│   ├── gacha.js          # Sistem gacha pembukaan peti harta
│   ├── ui.js             # Pengatur navigasi tab, modal dialog, inventori, HUD
│   └── game.js           # Inisialisasi game loop
└── assets/               # Aset sprites, UI kit, audio, dan background dari asset pack
```
