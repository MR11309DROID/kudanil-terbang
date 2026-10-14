Add-Type -TypeDefinition @"
using System;
using System.IO;

public class FullSfxSynthesizer {
    public static void WriteWav(string filePath, float[] left, float[] right, int sampleRate) {
        int numSamples = left.Length;
        int channels = 2;
        int byteRate = sampleRate * channels * 2;
        int blockAlign = channels * 2;
        int subChunk2Size = numSamples * channels * 2;
        int chunkSize = 36 + subChunk2Size;

        using (FileStream fs = new FileStream(filePath, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs)) {
            bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(chunkSize);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));
            bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
            bw.Write(16);
            bw.Write((short)1); // PCM
            bw.Write((short)channels);
            bw.Write(sampleRate);
            bw.Write(byteRate);
            bw.Write((short)blockAlign);
            bw.Write((short)16); // 16-bit
            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write(subChunk2Size);

            for (int i = 0; i < numSamples; i++) {
                float l = Math.Max(-1.0f, Math.Min(1.0f, left[i]));
                float r = Math.Max(-1.0f, Math.Min(1.0f, right[i]));
                short sL = (short)(l * 32760f);
                short sR = (short)(r * 32760f);
                bw.Write(sL);
                bw.Write(sR);
            }
        }
    }

    public static void ApplyReverb(float[] left, float[] right, int sr, float delaySec, float decay, float wet) {
        int dL = (int)(sr * delaySec);
        int dR = (int)(sr * (delaySec * 1.15f));
        for (int i = 0; i < left.Length; i++) {
            if (i >= dL) left[i] += left[i - dL] * decay * wet;
            if (i >= dR) right[i] += right[i - dR] * decay * wet;
        }
    }

    // 1. UI Click - Crisp Tactile Mobile RPG Pop
    public static void GenUiClick(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.06f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float freq = 1400f * (float)Math.Exp(-t * 80f) + 300f;
            float env = (float)Math.Exp(-t * 90f);
            float s = (float)Math.Sin(2 * Math.PI * freq * t) * env * 0.65f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 2. UI Confirm - Cheerful Positive Duo-Chime
    public static void GenUiConfirm(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.22f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 880f, 1318.51f }; // A5 -> E6
        float[] st = new float[] { 0f, 0.06f };
        for (int n = 0; n < 2; n++) {
            int sIdx = (int)(st[n] * sr);
            for (int i = sIdx; i < samples; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = (float)Math.Exp(-t * 22f);
                float s = (float)Math.Sin(2 * Math.PI * f[n] * t) * env * 0.45f;
                left[i] += s; right[i] += s;
            }
        }
        WriteWav(path, left, right, sr);
    }

    // 3. UI Cancel - Gentle Soft Downward Tone
    public static void GenUiCancel(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.16f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 784f, 523.25f }; // G5 -> C5
        float[] st = new float[] { 0f, 0.05f };
        for (int n = 0; n < 2; n++) {
            int sIdx = (int)(st[n] * sr);
            for (int i = sIdx; i < samples; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = (float)Math.Exp(-t * 25f);
                float s = (float)Math.Sin(2 * Math.PI * f[n] * t) * env * 0.35f;
                left[i] += s; right[i] += s;
            }
        }
        WriteWav(path, left, right, sr);
    }

    // 4. UI Hover - Micro Tactile Tick
    public static void GenUiHover(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.035f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float env = (float)Math.Exp(-t * 160f);
            float s = (float)Math.Sin(2 * Math.PI * 2200f * t) * env * 0.28f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 5. Slash - Swift Crisp Sword Blade Whoosh
    public static void GenSlash(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.22f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(101);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float freqSweep = 2800f * (1.0f - (t / 0.22f)) + 400f;
            float noise = (float)(rnd.NextDouble() * 2.0 - 1.0);
            float env = (float)Math.Sin(Math.PI * (t / 0.22f)) * (float)Math.Exp(-t * 6f);
            float bladeSine = (float)Math.Sin(2 * Math.PI * freqSweep * t) * 0.3f;
            float s = (noise * 0.5f + bladeSine) * env * 0.75f;
            left[i] = s * (1.0f - t / 0.22f);
            right[i] = s * (t / 0.22f);
        }
        WriteWav(path, left, right, sr);
    }

    // 6. Attack Light - Punchy Quick Whip Slash
    public static void GenAttackLight(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.20f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(102);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float pitch = 450f * (float)Math.Exp(-t * 22f) + 90f;
            float punch = (float)Math.Sin(2 * Math.PI * pitch * t);
            float noise = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 30f);
            float env = (float)Math.Exp(-t * 16f);
            float s = (punch * 0.6f + noise * 0.4f) * env * 0.8f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 7. Attack Heavy - Mighty Impact Slash
    public static void GenAttackHeavy(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.38f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(103);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float sub = (float)Math.Sin(2 * Math.PI * (120f * (float)Math.Exp(-t * 12f) + 40f) * t) * (float)Math.Exp(-t * 9f);
            float crack = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 24f);
            float blade = (float)Math.Sin(2 * Math.PI * 1800f * (float)Math.Exp(-t * 15f) * t) * (float)Math.Exp(-t * 14f);
            float s = (sub * 0.7f + crack * 0.4f + blade * 0.35f) * 0.85f;
            left[i] = s; right[i] = s;
        }
        ApplyReverb(left, right, sr, 0.05f, 0.3f, 0.25f);
        WriteWav(path, left, right, sr);
    }

    // 8. Hit - Punch Thump Impact
    public static void GenHit(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.16f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float pitch = 190f * (float)Math.Exp(-t * 35f) + 50f;
            float env = (float)Math.Exp(-t * 22f);
            float s = (float)Math.Sin(2 * Math.PI * pitch * t) * env * 0.8f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 9. Enemy Hit - Crunchy Monster Impact
    public static void GenEnemyHit(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.22f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(104);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float pitch = 240f * (float)Math.Exp(-t * 28f) + 60f;
            float crunch = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 32f);
            float thump = (float)Math.Sin(2 * Math.PI * pitch * t) * (float)Math.Exp(-t * 16f);
            float s = (thump * 0.65f + crunch * 0.45f) * 0.8f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 10. Enemy Die - Poof Cartoon Dissolve + Pop
    public static void GenEnemyDie(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.45f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(105);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float pop = (float)Math.Sin(2 * Math.PI * (180f + 500f * t) * t) * (float)Math.Exp(-t * 18f);
            float poof = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 7.5f) * (t > 0.05f ? 1f : t / 0.05f);
            float s = (pop * 0.5f + poof * 0.5f) * 0.75f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 11. Boss Roar - Monstrous Sub Growl & Tremor
    public static void GenBossRoar(string path) {
        int sr = 44100;
        int samples = (int)(sr * 1.1f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(106);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float trem = (float)(1.0 + 0.4 * Math.Sin(2 * Math.PI * 18f * t));
            float sub = (float)Math.Sin(2 * Math.PI * (55f + 15f * (float)Math.Sin(2 * Math.PI * 4f * t)) * t) * trem;
            float growl = (float)(rnd.NextDouble() * 2.0 - 1.0) * 0.35f;
            float env = (float)Math.Sin(Math.PI * Math.Min(1.0f, t / 0.9f)) * (float)Math.Exp(-t * 1.2f);
            float s = (sub * 0.75f + growl * 0.35f) * env * 0.85f;
            left[i] = s; right[i] = s;
        }
        ApplyReverb(left, right, sr, 0.08f, 0.4f, 0.3f);
        WriteWav(path, left, right, sr);
    }

    // 12. Boss Hit - Heavy Iron Crunch Impact
    public static void GenBossHit(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.35f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float sub = (float)Math.Sin(2 * Math.PI * (110f * (float)Math.Exp(-t * 14f) + 35f) * t) * (float)Math.Exp(-t * 9f);
            float metallic = (float)(Math.Sin(2 * Math.PI * 420f * t) + 0.5 * Math.Sin(2 * Math.PI * 880f * t)) * (float)Math.Exp(-t * 22f);
            float s = (sub * 0.7f + metallic * 0.4f) * 0.85f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 13. Dodge Whoosh - Swift Evasion Gust
    public static void GenDodgeWhoosh(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.28f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(107);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float pan = t / 0.28f;
            float noise = (float)(rnd.NextDouble() * 2.0 - 1.0);
            float env = (float)Math.Sin(Math.PI * pan) * (float)Math.Exp(-t * 4f);
            float s = noise * env * 0.65f;
            left[i] = s * (1.0f - pan * 0.8f);
            right[i] = s * (0.2f + pan * 0.8f);
        }
        WriteWav(path, left, right, sr);
    }

    // 14. Fire Spell & Cast - Combustion Burst
    public static void GenFireSpell(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.55f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(108);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float roar = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 5f);
            float boom = (float)Math.Sin(2 * Math.PI * (160f * (float)Math.Exp(-t * 10f) + 40f) * t) * (float)Math.Exp(-t * 7f);
            float s = (boom * 0.65f + roar * 0.45f) * 0.85f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 15. Ice Spell & Cast - Shimmering Frost Crackle
    public static void GenIceSpell(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.55f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] crystalF = new float[] { 2093f, 2637f, 3136f, 3729f };
        for (int n = 0; n < crystalF.Length; n++) {
            int st = (int)(n * 0.04f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 12f);
                float s = (float)Math.Sin(2 * Math.PI * crystalF[n] * t) * env * 0.22f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.06f, 0.4f, 0.35f);
        WriteWav(path, left, right, sr);
    }

    // 16. Lightning Spell - Electric Zap Crack
    public static void GenLightningSpell(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.42f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(109);
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float buzz = (float)Math.Sin(2 * Math.PI * (900f + 1400f * (float)rnd.NextDouble()) * t) * (float)Math.Exp(-t * 26f);
            float crack = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 18f);
            float s = (buzz * 0.6f + crack * 0.55f) * 0.85f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 17. Magic Burst - Arcane Shockwave Swell
    public static void GenMagicBurst(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.65f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float sw = (float)Math.Sin(2 * Math.PI * (400f + 1200f * t) * t) * (float)Math.Exp(-t * 4.5f);
            float chime = (float)Math.Sin(2 * Math.PI * 1760f * t) * (float)Math.Exp(-t * 6f);
            float s = (sw * 0.5f + chime * 0.4f) * 0.8f;
            left[i] = s; right[i] = s;
        }
        ApplyReverb(left, right, sr, 0.08f, 0.45f, 0.35f);
        WriteWav(path, left, right, sr);
    }

    // 18. Magic Charge - Ascending Power Swell
    public static void GenMagicCharge(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.55f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float f = 300f + 1100f * (t / 0.55f);
            float env = (t / 0.55f) * (float)Math.Exp(-(0.55f - t) * 2f);
            float s = (float)Math.Sin(2 * Math.PI * f * t) * env * 0.65f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 19. Heal & Heal Spell - Angelic Warm Chime
    public static void GenHeal(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.7f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 698.46f, 880f, 1046.50f, 1396.91f }; // F5, A5, C6, F6
        for (int n = 0; n < f.Length; n++) {
            int st = (int)(n * 0.065f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 4.5f);
                float s = (float)Math.Sin(2 * Math.PI * f[n] * t) * env * 0.28f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.09f, 0.5f, 0.4f);
        WriteWav(path, left, right, sr);
    }

    // 20. Shield & Shield Activate - Protective Aura Resonance
    public static void GenShield(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.55f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float hum = (float)Math.Sin(2 * Math.PI * 392f * t) * (float)Math.Exp(-t * 5.5f);
            float bell = (float)Math.Sin(2 * Math.PI * 1174.66f * t) * (float)Math.Exp(-t * 9.5f);
            float s = (hum * 0.55f + bell * 0.35f) * 0.75f;
            left[i] = s; right[i] = s;
        }
        ApplyReverb(left, right, sr, 0.07f, 0.35f, 0.3f);
        WriteWav(path, left, right, sr);
    }

    // 21. Poison Tick - Bubbling Toxic Drop
    public static void GenPoisonTick(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.25f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float mod = (float)(400f + 350f * Math.Sin(2 * Math.PI * 30f * t));
            float env = (float)Math.Exp(-t * 16f);
            float s = (float)Math.Sin(2 * Math.PI * mod * t) * env * 0.65f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 22. Coin Pickup - Crisp Metallic Coin Ting
    public static void GenCoinPickup(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.28f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] freqs = new float[] { 2637f, 3520f }; // E7 -> A7
        for (int n = 0; n < 2; n++) {
            int st = (int)(n * 0.045f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 18f);
                float s = (float)Math.Sin(2 * Math.PI * freqs[n] * t) * env * 0.45f;
                left[i] += s; right[i] += s;
            }
        }
        WriteWav(path, left, right, sr);
    }

    // 23. Gem Pickup - Prismatic Crystal Ring
    public static void GenGemPickup(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.4f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] freqs = new float[] { 2093f, 2793.83f, 3520f };
        for (int n = 0; n < freqs.Length; n++) {
            int st = (int)(n * 0.04f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 9.5f);
                float s = (float)Math.Sin(2 * Math.PI * freqs[n] * t) * env * 0.32f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.06f, 0.4f, 0.3f);
        WriteWav(path, left, right, sr);
    }

    // 24. Item Pickup - Juicy Bubble Pop
    public static void GenItemPickup(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.16f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        for (int i = 0; i < samples; i++) {
            float t = i / (float)sr;
            float freq = 380f + 850f * (float)Math.Sin(Math.PI * (t / 0.16f));
            float env = (float)Math.Exp(-t * 18f);
            float s = (float)Math.Sin(2 * Math.PI * freq * t) * env * 0.65f;
            left[i] = s; right[i] = s;
        }
        WriteWav(path, left, right, sr);
    }

    // 25. Chest Open - Wooden Latch Creak + Shiny Treasure Burst
    public static void GenChestOpen(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.85f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        Random rnd = new Random(110);
        // Wood creak
        for (int i = 0; i < (int)(0.2f * sr); i++) {
            float t = i / (float)sr;
            float creak = (float)(Math.Sin(2 * Math.PI * (160f + 60f * Math.Sin(2 * Math.PI * 40f * t)) * t) * (rnd.NextDouble() * 0.4 + 0.6));
            left[i] += creak * 0.4f; right[i] += creak * 0.4f;
        }
        // Gold chime burst
        float[] ch = new float[] { 1046.50f, 1318.51f, 1567.98f, 2093f };
        for (int n = 0; n < ch.Length; n++) {
            int st = (int)((0.18f + n * 0.05f) * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 6f);
                float s = (float)Math.Sin(2 * Math.PI * ch[n] * t) * env * 0.32f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.08f, 0.45f, 0.35f);
        WriteWav(path, left, right, sr);
    }

    // 26. Loot Rare - Glorious Shimmer Chime Cascade
    public static void GenLootRare(string path) {
        int sr = 44100;
        int samples = (int)(sr * 1.3f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 783.99f, 987.77f, 1174.66f, 1567.98f, 1975.53f };
        for (int n = 0; n < f.Length; n++) {
            int st = (int)(n * 0.07f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 3.8f);
                float s = (float)(Math.Sin(2 * Math.PI * f[n] * t) + 0.3 * Math.Sin(2 * Math.PI * (f[n] * 2.0) * t)) * env * 0.3f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.09f, 0.5f, 0.4f);
        WriteWav(path, left, right, sr);
    }

    // 27. Level Up - Signature Mobile RPG Fanfare Chime
    public static void GenLevelUp(string path) {
        int sr = 44100;
        int samples = (int)(sr * 1.25f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 523.25f, 659.25f, 783.99f, 1046.50f, 1318.51f }; // C5, E5, G5, C6, E6
        for (int n = 0; n < f.Length; n++) {
            int st = (int)(n * 0.08f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 3.6f);
                float s = (float)(Math.Sin(2 * Math.PI * f[n] * t) + 0.35 * Math.Sin(2 * Math.PI * (f[n] * 2.0) * t)) * env * 0.35f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.08f, 0.45f, 0.35f);
        WriteWav(path, left, right, sr);
    }

    // 28. Quest Complete - Joyous Jingle
    public static void GenQuestComplete(string path) {
        int sr = 44100;
        int samples = (int)(sr * 0.95f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 523.25f, 783.99f, 659.25f, 1046.50f }; // C5, G5, E5, C6
        for (int n = 0; n < f.Length; n++) {
            int st = (int)(n * 0.09f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 4.2f);
                float s = (float)Math.Sin(2 * Math.PI * f[n] * t) * env * 0.38f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.08f, 0.45f, 0.35f);
        WriteWav(path, left, right, sr);
    }

    // 29. Victory - Triumphant Battle Fanfare
    public static void GenVictory(string path) {
        int sr = 44100;
        int samples = (int)(sr * 1.6f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 523.25f, 523.25f, 659.25f, 783.99f, 1046.50f };
        float[] st = new float[] { 0.0f, 0.12f, 0.24f, 0.36f, 0.50f };
        float[] dur = new float[] { 0.15f, 0.15f, 0.18f, 0.20f, 1.0f };
        for (int n = 0; n < f.Length; n++) {
            int sIdx = (int)(st[n] * sr);
            int eIdx = Math.Min(samples, sIdx + (int)(dur[n] * sr));
            for (int i = sIdx; i < eIdx; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = (float)Math.Exp(-t * (n == 4 ? 2.2 : 5.0));
                float s = (float)(Math.Sin(2 * Math.PI * f[n] * t) + 0.3 * Math.Sin(2 * Math.PI * (f[n] * 2.0) * t)) * env * 0.42f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.09f, 0.45f, 0.35f);
        WriteWav(path, left, right, sr);
    }

    // 30. Defeat - Melancholy Gentle Loss Chime
    public static void GenDefeat(string path) {
        int sr = 44100;
        int samples = (int)(sr * 1.35f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 587.33f, 554.37f, 523.25f, 440f }; // D5, C#5, C5, A4
        for (int n = 0; n < f.Length; n++) {
            int st = (int)(n * 0.14f * sr);
            for (int i = st; i < samples; i++) {
                float t = (i - st) / (float)sr;
                float env = (float)Math.Exp(-t * 3.5f);
                float s = (float)Math.Sin(2 * Math.PI * f[n] * t) * env * 0.35f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.08f, 0.4f, 0.3f);
        WriteWav(path, left, right, sr);
    }

    // 31. Stage Clear - Grand Victorious Chorus
    public static void GenStageClear(string path) {
        int sr = 44100;
        int samples = (int)(sr * 2.2f);
        float[] left = new float[samples];
        float[] right = new float[samples];
        float[] f = new float[] { 392f, 523.25f, 659.25f, 783.99f, 1046.50f, 1318.51f };
        float[] st = new float[] { 0.0f, 0.10f, 0.20f, 0.30f, 0.42f, 0.56f };
        for (int n = 0; n < f.Length; n++) {
            int sIdx = (int)(st[n] * sr);
            for (int i = sIdx; i < samples; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = (float)Math.Exp(-t * (n == 5 ? 1.6 : 4.5));
                float s = (float)(Math.Sin(2 * Math.PI * f[n] * t) + 0.35 * Math.Sin(2 * Math.PI * (f[n] * 2.0) * t)) * env * 0.38f;
                left[i] += s; right[i] += s;
            }
        }
        ApplyReverb(left, right, sr, 0.10f, 0.5f, 0.4f);
        WriteWav(path, left, right, sr);
    }
}
"@

$targetDir = "assets\audio\sfx"
if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }

Write-Host "Synthesizing UI sound effects..."
[FullSfxSynthesizer]::GenUiClick("$targetDir\ui_click.wav")
[FullSfxSynthesizer]::GenUiConfirm("$targetDir\ui_confirm.wav")
[FullSfxSynthesizer]::GenUiCancel("$targetDir\ui_cancel.wav")
[FullSfxSynthesizer]::GenUiHover("$targetDir\ui_hover.wav")

Write-Host "Synthesizing Combat sounds..."
[FullSfxSynthesizer]::GenSlash("$targetDir\slash.wav")
[FullSfxSynthesizer]::GenAttackLight("$targetDir\attack_light.wav")
[FullSfxSynthesizer]::GenAttackHeavy("$targetDir\attack_heavy.wav")
[FullSfxSynthesizer]::GenHit("$targetDir\hit.wav")
[FullSfxSynthesizer]::GenEnemyHit("$targetDir\enemy_hit.wav")
[FullSfxSynthesizer]::GenEnemyDie("$targetDir\enemy_die.wav")
[FullSfxSynthesizer]::GenBossRoar("$targetDir\boss_roar.wav")
[FullSfxSynthesizer]::GenBossHit("$targetDir\boss_hit.wav")
[FullSfxSynthesizer]::GenDodgeWhoosh("$targetDir\dodge_whoosh.wav")

Write-Host "Synthesizing Magic & Spells..."
[FullSfxSynthesizer]::GenFireSpell("$targetDir\fire_spell.wav")
[FullSfxSynthesizer]::GenFireSpell("$targetDir\fire_cast.wav")
[FullSfxSynthesizer]::GenIceSpell("$targetDir\ice_spell.wav")
[FullSfxSynthesizer]::GenIceSpell("$targetDir\ice_cast.wav")
[FullSfxSynthesizer]::GenLightningSpell("$targetDir\lightning_spell.wav")
[FullSfxSynthesizer]::GenLightningSpell("$targetDir\lightning_cast.wav")
[FullSfxSynthesizer]::GenMagicBurst("$targetDir\magic_burst.wav")
[FullSfxSynthesizer]::GenMagicCharge("$targetDir\magic_charge.wav")
[FullSfxSynthesizer]::GenHeal("$targetDir\heal.wav")
[FullSfxSynthesizer]::GenHeal("$targetDir\heal_spell.wav")
[FullSfxSynthesizer]::GenShield("$targetDir\shield.wav")
[FullSfxSynthesizer]::GenShield("$targetDir\shield_activate.wav")
[FullSfxSynthesizer]::GenPoisonTick("$targetDir\poison_tick.wav")

Write-Host "Synthesizing Loot, Chests & Progression..."
[FullSfxSynthesizer]::GenCoinPickup("$targetDir\coin_pickup.wav")
[FullSfxSynthesizer]::GenGemPickup("$targetDir\gem_pickup.wav")
[FullSfxSynthesizer]::GenItemPickup("$targetDir\item_pickup.wav")
[FullSfxSynthesizer]::GenChestOpen("$targetDir\chest_open.wav")
[FullSfxSynthesizer]::GenChestOpen("$targetDir\chest_open_v2.wav")
[FullSfxSynthesizer]::GenLootRare("$targetDir\loot_rare.wav")
[FullSfxSynthesizer]::GenLevelUp("$targetDir\level_up.wav")
[FullSfxSynthesizer]::GenQuestComplete("$targetDir\quest_complete.wav")

Write-Host "Synthesizing Game State fanfares..."
[FullSfxSynthesizer]::GenVictory("$targetDir\victory.wav")
[FullSfxSynthesizer]::GenDefeat("$targetDir\defeat.wav")
[FullSfxSynthesizer]::GenStageClear("$targetDir\stage_clear.wav")

Write-Host "ALL 37 GAME SOUND EFFECTS SYNTHESIZED SUCCESSFULLY!"
