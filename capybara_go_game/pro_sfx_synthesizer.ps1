Add-Type -TypeDefinition @"
using System;
using System.IO;

public class ProAudioMaster {
    // Soft Analog Limiter / Tape Saturation (Warm, punchy, studio-grade mastering)
    public static float Saturate(float x, float drive = 1.15f) {
        float d = x * drive;
        return (float)Math.Tanh(d);
    }

    // High quality 2-pole Biquad IIR Filter
    public class Biquad {
        float b0, b1, b2, a1, a2;
        float x1, x2, y1, y2;

        public void SetLowpass(float freq, float q, int sr) {
            float w0 = (float)(2.0 * Math.PI * freq / sr);
            float alpha = (float)(Math.Sin(w0) / (2.0 * q));
            float cosw0 = (float)Math.Cos(w0);

            float a0 = 1.0f + alpha;
            b0 = ((1.0f - cosw0) / 2.0f) / a0;
            b1 = (1.0f - cosw0) / a0;
            b2 = ((1.0f - cosw0) / 2.0f) / a0;
            a1 = (-2.0f * cosw0) / a0;
            a2 = (1.0f - alpha) / a0;
        }

        public void SetBandpass(float freq, float q, int sr) {
            float w0 = (float)(2.0 * Math.PI * freq / sr);
            float alpha = (float)(Math.Sin(w0) / (2.0 * q));
            float cosw0 = (float)Math.Cos(w0);

            float a0 = 1.0f + alpha;
            b0 = (alpha) / a0;
            b1 = 0.0f;
            b2 = (-alpha) / a0;
            a1 = (-2.0f * cosw0) / a0;
            a2 = (1.0f - alpha) / a0;
        }

        public float Process(float inSample) {
            float outSample = b0 * inSample + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1; x1 = inSample;
            y2 = y1; y1 = outSample;
            return outSample;
        }
    }

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
            bw.Write((short)16);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write(subChunk2Size);

            // Master Peak Normalizer & Soft Limiter
            float maxPeak = 0.001f;
            for (int i = 0; i < numSamples; i++) {
                maxPeak = Math.Max(maxPeak, Math.Max(Math.Abs(left[i]), Math.Abs(right[i])));
            }
            float normGain = 0.94f / maxPeak;
            if (normGain > 2.5f) normGain = 2.5f;

            for (int i = 0; i < numSamples; i++) {
                float l = Saturate(left[i] * normGain);
                float r = Saturate(right[i] * normGain);
                short sL = (short)(Math.Max(-1.0f, Math.Min(1.0f, l)) * 32760f);
                short sR = (short)(Math.Max(-1.0f, Math.Min(1.0f, r)) * 32760f);
                bw.Write(sL);
                bw.Write(sR);
            }
        }
    }

    // Professional Stereo Space Reverb with 4-tap diffusion
    public static void ApplyStudioReverb(float[] left, float[] right, int sr, float size = 1.0f, float wet = 0.32f) {
        int[] delaysL = new int[] { (int)(sr * 0.027f * size), (int)(sr * 0.053f * size), (int)(sr * 0.089f * size), (int)(sr * 0.137f * size) };
        int[] delaysR = new int[] { (int)(sr * 0.031f * size), (int)(sr * 0.059f * size), (int)(sr * 0.097f * size), (int)(sr * 0.149f * size) };
        float[] gains = new float[] { 0.42f, 0.32f, 0.22f, 0.14f };

        float[] bufL = (float[])left.Clone();
        float[] bufR = (float[])right.Clone();

        for (int i = 0; i < left.Length; i++) {
            float revL = 0;
            float revR = 0;
            for (int k = 0; k < 4; k++) {
                if (i >= delaysL[k]) revL += bufL[i - delaysL[k]] * gains[k];
                if (i >= delaysR[k]) revR += bufR[i - delaysR[k]] * gains[k];
            }
            left[i] += revL * wet;
            right[i] += revR * wet;
        }
    }

    // =========================================================================
    // 1. MINOR FORTUNE (HOKI) - Signature YouTube Celesta Glockenspiel Chime
    // =========================================================================
    public static void GenMinorFortune(string path) {
        int sr = 44100;
        int samples = (int)(sr * 1.85f);
        float[] left = new float[samples];
        float[] right = new float[samples];

        // Notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), B5 (988Hz), C6 (1046Hz)
        float[] notes = new float[] { 523.25f, 659.25f, 783.99f, 987.77f, 1046.50f };
        float[] times = new float[] { 0.00f, 0.08f, 0.16f, 0.24f, 0.32f };

        for (int n = 0; n < notes.Length; n++) {
            float f = notes[n];
            int sIdx = (int)(times[n] * sr);
            float panL = 0.3f + 0.1f * n;
            float panR = 1.0f - panL;

            for (int i = sIdx; i < samples; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = (float)Math.Exp(-t * (n == 4 ? 2.8f : 4.5f));
                if (t < 0.008f) env *= (t / 0.008f);

                // Layer 1: Mallet Wooden Click Transient
                float transient = (float)(Math.Sin(2 * Math.PI * (f * 4f) * t) * Math.Exp(-t * 90f) * 0.25f);
                // Layer 2: Glockenspiel Fundamental + High Crystal Harmonic FM
                double fmMod = 0.25 * Math.Sin(2 * Math.PI * (f * 2.76) * t) * Math.Exp(-t * 6f);
                double carrier = Math.Sin(2 * Math.PI * f * t + fmMod);
                // Layer 3: Warm Bell Overtone
                double bell2 = 0.22 * Math.Sin(2 * Math.PI * (f * 2.0) * t) * Math.Exp(-t * 4.2f);

                float s = (float)((transient + carrier + bell2) * env * 0.36);
                left[i] += s * panL;
                right[i] += s * panR;
            }
        }

        // Sparkling Glint Shower (High shimmer air)
        Random rnd = new Random(2026);
        for (int k = 0; k < 12; k++) {
            float tG = 0.34f + k * 0.045f;
            float fG = 2200f + (float)rnd.NextDouble() * 2200f;
            int gIdx = (int)(tG * sr);
            float pL = (float)rnd.NextDouble();
            float pR = 1.0f - pL;

            for (int i = gIdx; i < Math.Min(samples, gIdx + (int)(0.35f * sr)); i++) {
                float t = (i - gIdx) / (float)sr;
                float env = (float)Math.Exp(-t * 12.0f);
                float s = (float)(Math.Sin(2 * Math.PI * fG * t) * env * 0.09f);
                left[i] += s * pL;
                right[i] += s * pR;
            }
        }

        ApplyStudioReverb(left, right, sr, 1.2f, 0.38f);
        WriteWav(path, left, right, sr);
    }

    // =========================================================================
    // 2. MAJOR FORTUNE (BIG HOKI) - Royal Brass Orchestral Fanfare & Golden Glissando
    // =========================================================================
    public static void GenMajorFortune(string path) {
        int sr = 44100;
        int samples = (int)(sr * 2.5f);
        float[] left = new float[samples];
        float[] right = new float[samples];

        // Brass Fanfare Lead: G4 -> C5 -> E5 -> G5 -> C6 -> E6
        float[] fNotes = new float[] { 392.00f, 523.25f, 659.25f, 783.99f, 1046.50f, 1318.51f };
        float[] fTimes = new float[] { 0.00f, 0.11f, 0.22f, 0.33f, 0.44f, 0.55f };
        float[] fDurs = new float[] { 0.18f, 0.18f, 0.19f, 0.20f, 0.45f, 1.80f };

        for (int n = 0; n < fNotes.Length; n++) {
            float f = fNotes[n];
            int sIdx = (int)(fTimes[n] * sr);
            int eIdx = Math.Min(samples, sIdx + (int)(fDurs[n] * sr));

            for (int i = sIdx; i < eIdx; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = 1.0f;
                if (t < 0.015f) env = t / 0.015f;
                else env = (float)Math.Exp(-(t - 0.015f) * (n == 5 ? 1.4f : 3.8f));

                double pitch = f;
                if (n == 5 && t > 0.25f) {
                    pitch += 4.5 * Math.Sin(2 * Math.PI * 5.8 * (t - 0.25f)); // Warm brass vibrato
                }

                // Layer 1: Rich Brass Triangle Body
                double b1 = Math.Sin(2 * Math.PI * pitch * t);
                // Layer 2: Horn Warmth (Formant Sawtooth)
                double b2 = 0.38 * Math.Sin(2 * Math.PI * (pitch * 2.0) * t);
                double b3 = 0.18 * Math.Sin(2 * Math.PI * (pitch * 3.0) * t);
                // Layer 3: Warm Bell Overtone
                double bell = 0.22 * Math.Sin(2 * Math.PI * (pitch * 4.0) * t) * Math.Exp(-t * 2.5f);

                float s = (float)((b1 + b2 + b3 + bell) * env * 0.32);
                left[i] += s * 0.85f;
                right[i] += s * 0.85f;
            }
        }

        // Warm Root Sub-Chord (C3 130.8Hz + G3 196.0Hz)
        int subStart = (int)(0.44f * sr);
        for (int i = subStart; i < Math.Min(samples, subStart + (int)(1.8f * sr)); i++) {
            float t = (i - subStart) / (float)sr;
            float env = (float)Math.Exp(-t * 1.8f);
            if (t < 0.03f) env *= (t / 0.03f);
            float s = (float)((Math.Sin(2 * Math.PI * 130.81 * t) + 0.65 * Math.Sin(2 * Math.PI * 196.0 * t)) * env * 0.30f);
            left[i] += s; right[i] += s;
        }

        // Celestial Harp Golden Cascade (12-note ascending glissando sweep)
        float[] harp = new float[] { 1046.5f, 1174.6f, 1318.5f, 1396.9f, 1567.9f, 1760.0f, 1975.5f, 2093.0f, 2349.3f, 2637.0f, 2793.8f, 3136.0f };
        for (int h = 0; h < harp.Length; h++) {
            float tH = 0.50f + h * 0.032f;
            int hStart = (int)(tH * sr);
            float panL = 0.15f + 0.7f * (h / (float)harp.Length);
            float panR = 1.0f - panL;

            for (int i = hStart; i < Math.Min(samples, hStart + (int)(0.6f * sr)); i++) {
                float t = (i - hStart) / (float)sr;
                float env = (float)Math.Exp(-t * 6.5f);
                float s = (float)(Math.Sin(2 * Math.PI * harp[h] * t) * env * 0.14f);
                left[i] += s * panL;
                right[i] += s * panR;
            }
        }

        ApplyStudioReverb(left, right, sr, 1.4f, 0.40f);
        WriteWav(path, left, right, sr);
    }

    // =========================================================================
    // 3. MISFORTUNE (TAKDIR BURUK) - Authentic Comic Cartoon Trombone Wah-Wah & Thud
    // =========================================================================
    public static void GenMisfortune(string path) {
        int sr = 44100;
        int samples = (int)(sr * 2.2f);
        float[] left = new float[samples];
        float[] right = new float[samples];

        // 1. Heavy Cartoon Comic Punch Thud (170Hz -> 35Hz drop)
        int thudSamples = (int)(0.35f * sr);
        for (int i = 0; i < thudSamples; i++) {
            float t = i / (float)sr;
            float freq = 170.0f * (float)Math.Exp(-t * 8.5) + 35.0f;
            float env = (float)Math.Exp(-t * 7.5);
            float s = (float)Math.Sin(2 * Math.PI * freq * t) * env * 0.85f;
            left[i] += s; right[i] += s;
        }

        // 2. Cartoon Sad Trombone Muted Wah-Wah: Eb4 (311Hz) -> D4 (294Hz) -> Db4 (277Hz) -> C4 (261Hz lemas)
        float[] sadP = new float[] { 311.13f, 293.66f, 277.18f, 261.63f };
        float[] sadT = new float[] { 0.22f, 0.52f, 0.82f, 1.12f };
        float[] sadD = new float[] { 0.29f, 0.29f, 0.29f, 0.95f };

        for (int n = 0; n < sadP.Length; n++) {
            float f = sadP[n];
            int sIdx = (int)(sadT[n] * sr);
            int eIdx = Math.Min(samples, sIdx + (int)(sadD[n] * sr));

            // Biquad filter for vocal formant "Wah" sweep (mouth opening and closing)
            Biquad wahFilter = new Biquad();

            for (int i = sIdx; i < eIdx; i++) {
                float t = (i - sIdx) / (float)sr;
                float env = 1.0f;
                if (t < 0.025f) env = t / 0.025f;
                else env = (float)Math.Exp(-(t - 0.025f) * (n == 3 ? 2.2f : 4.5f));

                double pitch = f;
                pitch -= 8.0 * (t / sadD[n]); // Downward sad slide

                // Lip vibrato on final note
                if (n == 3 && t > 0.18f) {
                    pitch += 6.5 * Math.Sin(2 * Math.PI * 5.2 * (t - 0.18f));
                }

                // Dynamic Wah Formant Center Frequency
                float formantF = (float)(600.0 + 750.0 * Math.Sin(Math.PI * Math.Min(1.0, t / 0.18)));
                wahFilter.SetBandpass(formantF, 2.5f, sr);

                // Muted Trombone Harmonics
                double raw = Math.Sin(2 * Math.PI * pitch * t)
                           + 0.65 * Math.Sin(2 * Math.PI * (pitch * 2.0) * t)
                           + 0.45 * Math.Sin(2 * Math.PI * (pitch * 3.0) * t)
                           + 0.25 * Math.Sin(2 * Math.PI * (pitch * 4.0) * t);

                float filtered = wahFilter.Process((float)raw);
                float s = (float)(filtered * env * 0.75);
                left[i] += s * 0.9f;
                right[i] += s * 0.9f;
            }
        }

        // 3. Subtle Comic Dissonant Tritone Drone (A3 + Eb4)
        for (int i = (int)(0.35f * sr); i < (int)(1.9f * sr); i++) {
            float t = (i - (int)(0.35f * sr)) / (float)sr;
            float env = (float)Math.Exp(-t * 2.2f);
            float d = (float)((Math.Sin(2 * Math.PI * 220.0 * t) + 0.7 * Math.Sin(2 * Math.PI * 311.13 * t)) * env * 0.15f);
            left[i] += d; right[i] += d;
        }

        ApplyStudioReverb(left, right, sr, 0.8f, 0.28f);
        WriteWav(path, left, right, sr);
    }
}
"@

$targetDir = "assets\audio\sfx"

Write-Host "Re-synthesizing Master-grade Minor Fortune..."
[ProAudioMaster]::GenMinorFortune("$targetDir\fortune_real.wav")

Write-Host "Re-synthesizing Master-grade Major Fortune..."
[ProAudioMaster]::GenMajorFortune("$targetDir\major_fortune_real.wav")

Write-Host "Re-synthesizing Master-grade Misfortune..."
[ProAudioMaster]::GenMisfortune("$targetDir\misfortune_real.wav")

Write-Host "STUDIO MASTER SFX UPGRADE COMPLETE!"
