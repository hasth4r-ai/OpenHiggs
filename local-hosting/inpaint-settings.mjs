import {processingSize} from '../packages/studio/src/inpaintResolution.mjs';

export function inpaintSettings(defaults, preset, body, info, session) {
  if (!['remove', 'replace'].includes(body.mode)) throw new Error('Choose Remove or Replace.');
  if (!String(body.prompt || '').trim()) throw new Error('Describe what to remove or replace.');
  const denoise = Number(body.denoise ?? 0.85);
  const expand = Number(body.expand ?? 16);
  const feather = Number(body.feather ?? 4);
  if (!Number.isFinite(denoise) || denoise < 0.1 || denoise > 1) throw new Error('Denoising must be between 0.1 and 1.');
  if (!Number.isInteger(expand) || expand < 0 || expand > 64 || !Number.isFinite(feather) || feather < 0 || feather > 32) throw new Error('Invalid mask expansion or feathering.');
  const size = processingSize(info, body.processingResolution ?? '720');

  // Wan2GP MiniMax H3 Ref2VA official frame-0 anchor pattern:
  const refHeader = body.reference
    ? `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n`
    : '';

  const instruction = body.mode === 'remove'
    ? 'Reconstruct and seamlessly infill the masked area to match background texture, lighting, and ambient details.'
    : 'Replace the masked area as described, matching scene perspective, lighting, shadows, and motion.';

  const prompt = `${refHeader}integrated_multimodal_description: [Shot 1] Edit the footage within the masked area. ${instruction} ${body.prompt.trim()} Ensure temporal consistency across frames with clean natural movement.\noverall_soundscape: Ambient room tone.\nnon_diegetic_music: N/A`;

  return {
    ...defaults,
    ...preset,
    model_type: 'minimax_h3_ref2va_pruned',
    client_id: session,
    prompt,
    prompt_enhancer: '',
    multi_prompts_gen_type: 'FG',
    activated_loras: [],
    loras_multipliers: '',
    resolution: `${size.width}x${size.height}`,
    video_length: info.frames,
    force_fps: 'control',
    video_prompt_type: body.reference ? 'GVAI' : 'GVA',
    video_guide: 'source' + body.sourceExtension,
    video_mask: 'mask.mkv',
    image_refs: body.reference ? ['reference' + body.referenceExtension] : null,
    image_start: null,
    image_end: null,
    video_source: null,
    video_guide2: null,
    video_guide3: null,
    audio_guide: null,
    audio_guide2: null,
    audio_guide3: null,
    audio_source: null,
    audio_prompt_type: '',
    denoising_strength: denoise,
    masking_strength: 1,
    mask_expand: Math.max(expand, 16),
    num_inference_steps: 20,
    batch_size: 1,
    repeat_generation: 1,
    output_filename: `inpaint_${session}`,
    custom_settings: {
      ...preset.custom_settings,
      h3_mask_mode: 'shared_timestep'
    }
  };
}
