import {processingSize} from '../packages/studio/src/inpaintResolution.mjs';

export function calculateModelFrames(frames, modelType) {
  const isWan21 = modelType === 'wan21' || modelType === 'vace_14B_fusionix';
  if (isWan21) {
    // Wan 2.1 Vace 14B FusioniX: minimum 17 frames, step 4 (17 + 4*k)
    return frames <= 17 ? 17 : 17 + Math.ceil((frames - 17) / 4) * 4;
  }
  // MiniMax H3 Ref2VA: minimum 107 frames, step 17, offset 5 (5 + 17*k, k >= 6)
  if (frames <= 107) return 107;
  return 5 + Math.ceil((frames - 5) / 17) * 17;
}

export function inpaintSettings(defaults, preset, body, info, session) {
  if (!['remove', 'replace'].includes(body.mode)) throw new Error('Choose Remove or Replace.');
  if (!String(body.prompt || '').trim() && !preset.prompt) throw new Error('Describe what to remove or replace.');

  const isWan21 = body.model === 'wan21' || preset.model_type === 'vace_14B_fusionix';
  const targetFrames = calculateModelFrames(info.frames, isWan21 ? 'wan21' : 'minimax_h3');
  const guideFileName = (body.padded ? 'source_padded' : 'source') + (body.guideExtension || body.sourceExtension);

  if (isWan21) {
    let resolution = preset.resolution || '1920x1088';
    if (body.processingResolution === '720') resolution = '1280x720';
    else if (body.processingResolution === '480') resolution = '848x480';
    else if (body.processingResolution === '1080') resolution = '1920x1088';

    const promptText = String(body.prompt || '').trim() || preset.prompt;
    const expand = Number(body.expand ?? preset.mask_expand ?? 32);

    return {
      ...defaults,
      ...preset,
      client_id: session,
      model_type: 'vace_14B_fusionix',
      base_model_type: 'vace_14B',
      model_filename: 'https://huggingface.co/DeepBeepMeep/Wan2.1/resolve/main/Wan14BT2VFusioniX_quanto_bf16_int8.safetensors',
      prompt: promptText,
      negative_prompt: body.negative_prompt || preset.negative_prompt || '',
      resolution,
      video_length: targetFrames,
      seed: Number(body.seed ?? preset.seed ?? 174999669),
      force_fps: String(Math.round(info.fps)),
      num_inference_steps: Number(body.steps ?? preset.num_inference_steps ?? 20),
      guidance_scale: Number(preset.guidance_scale ?? 1),
      guidance_phases: Number(preset.guidance_phases ?? 1),
      flow_shift: Number(preset.flow_shift ?? 2),
      sample_solver: preset.sample_solver ?? 'unipc',
      repeat_generation: 1,
      multi_prompts_gen_type: preset.multi_prompts_gen_type ?? 'G',
      video_prompt_type: body.reference ? 'MVAKI' : 'MVA',
      video_guide: guideFileName,
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
      control_net_weight: Number(preset.control_net_weight ?? 1),
      control_net_weight2: Number(preset.control_net_weight2 ?? 1),
      mask_expand: Math.max(expand, 16),
      sliding_window_size: Number(preset.sliding_window_size ?? 81),
      sliding_window_overlap: Number(preset.sliding_window_overlap ?? 5),
      sliding_window_color_correction_strength: Number(preset.sliding_window_color_correction_strength ?? 1),
      sliding_window_overlap_noise: Number(preset.sliding_window_overlap_noise ?? 20),
      spatial_upsampling: preset.spatial_upsampling ?? 'lanczos*2',
      spatial_upsampler_prompt: preset.spatial_upsampler_prompt ?? 'sharp photographic detail, crisp natural texture, fine surface detail, clean edges, natural film grain, high resolution footage',
      cfg_star_switch: Number(preset.cfg_star_switch ?? 1),
      cfg_zero_step: Number(preset.cfg_zero_step ?? -1),
      prompt_enhancer: preset.prompt_enhancer ?? 'T',
      override_profile: Number(preset.override_profile ?? 4),
      output_filename: `inpaint_${session}`
    };
  }

  // MiniMax H3 Ref2VA
  const expand = Number(body.expand ?? preset.mask_expand ?? 30);
  const size = processingSize(info, body.processingResolution ?? '720');

  const refHeader = body.reference
    ? `For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.\n`
    : '';

  const instruction = body.mode === 'remove'
    ? 'Reconstruct and seamlessly infill the masked area to match background texture, lighting, and ambient details.'
    : 'Replace the masked area as described, matching scene perspective, lighting, shadows, and motion.';

  const userPrompt = String(body.prompt || '').trim();
  const prompt = `${refHeader}integrated_multimodal_description: [Shot 1] Edit the footage within the masked area. ${instruction} ${userPrompt} Ensure temporal consistency across frames with clean natural movement.\noverall_soundscape: Ambient room tone.\nnon_diegetic_music: N/A`;

  return {
    ...defaults,
    ...preset,
    model_type: 'minimax_h3_ref2va_pruned',
    base_model_type: 'minimax_h3_ref2va',
    client_id: session,
    prompt,
    prompt_enhancer: 'T',
    multi_prompts_gen_type: 'PG',
    activated_loras: [],
    loras_multipliers: '',
    resolution: `${size.width}x${size.height}`,
    video_length: targetFrames,
    force_fps: '',
    video_prompt_type: body.reference ? 'GVAI' : 'GVA',
    video_guide: guideFileName,
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
    denoising_strength: 1,
    masking_strength: 1,
    mask_expand: Math.max(expand, 30),
    sliding_window_size: Number(preset.sliding_window_size ?? 362),
    sliding_window_overlap: Number(preset.sliding_window_overlap ?? 18),
    sliding_window_discard_last_frames: 0,
    sliding_window_trim_first_frames: 0,
    image_refs_relative_size: 100,
    remove_background_images_ref: 0,
    flow_shift: Number(preset.flow_shift ?? 12),
    sample_solver: preset.sample_solver ?? 'euler',
    num_inference_steps: Number(body.steps ?? preset.num_inference_steps ?? 20),
    guidance_phases: 1,
    batch_size: 1,
    repeat_generation: 1,
    output_filename: `inpaint_${session}`,
    custom_settings: {
      ...preset.custom_settings,
      h3_mask_mode: 'grouped_rows',
      audio_refinement: 'none'
    }
  };
}
