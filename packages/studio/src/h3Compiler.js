/**
 * MiniMax H3 Ref2VA Prompt Compiler
 * Translates natural human intent + @mentions into the strict 6-section H3 Ref2VA syntax.
 * Rule: STRICTLY NO EMPTY LINES between sections.
 */

export function compileH3Prompt({
  userPrompt = '',
  references = [],
  duration = 5,
  preset = 'general',
  cameraMotion = '',
  mode = 'video',
}) {
  const cleanPrompt = (userPrompt || '').replace(/\r?\n+/g, ' ').trim();

  // If there are no references and prompt is empty, return empty
  if (!cleanPrompt && references.length === 0) {
    return '';
  }

  const isImageMode = mode === 'image';

  // Group references - handle both { type: 'image' } and legacy objects
  const imageRefs = references.filter(r => !r.type || r.type === 'image');
  const videoRefs = isImageMode ? [] : references.filter(r => r.type === 'video');
  const audioRefs = isImageMode ? [] : references.filter(r => r.type === 'audio');

  // If there are no references at all, return the clean user prompt directly
  if (imageRefs.length === 0 && videoRefs.length === 0 && audioRefs.length === 0) {
    return cleanPrompt;
  }

  // 1. subject_definitions
  const subjectDefs = [];
  let subjectIdx = 1;
  const tagToSubjectMap = new Map();

  imageRefs.forEach((ref, idx) => {
    const picNum = idx + 1;
    const sNum = subjectIdx++;
    if (ref.tag) {
      tagToSubjectMap.set(ref.tag.toLowerCase(), `<Subject ${sNum}>`);
    }
    tagToSubjectMap.set(`@image${picNum}`.toLowerCase(), `<Subject ${sNum}>`);
    tagToSubjectMap.set(`image ${picNum}`.toLowerCase(), `<Subject ${sNum}>`);
    tagToSubjectMap.set(`image${picNum}`.toLowerCase(), `<Subject ${sNum}>`);
    tagToSubjectMap.set(`picture ${picNum}`.toLowerCase(), `<Subject ${sNum}>`);
    tagToSubjectMap.set(`picture${picNum}`.toLowerCase(), `<Subject ${sNum}>`);

    if (ref.role === 'costume_style' || ref.role === 'costume') {
      subjectDefs.push(`<Subject ${sNum}> is the costume/outfit from <Picture ${picNum}>, preserving clothing shape, style, fabric texture, and color.`);
    } else if (ref.role === 'environment' || ref.role === 'style') {
      subjectDefs.push(`<Subject ${sNum}> is the atmospheric environment and stylistic lighting from <Picture ${picNum}>.`);
    } else if (ref.role === 'keyframe_start') {
      subjectDefs.push(`<Picture ${picNum}> establishes the concrete first frame starting composition and camera origin.`);
    } else if (ref.role === 'keyframe_end') {
      subjectDefs.push(`<Picture ${picNum}> establishes the concrete ending frame target composition and concluding scene state.`);
    } else {
      // Default: Character / Face identity
      subjectDefs.push(`<Subject ${sNum}> is the primary character from <Picture ${picNum}>, preserving facial identity, features, and physical appearance.`);
    }
  });

  videoRefs.forEach((ref, idx) => {
    const vNum = idx + 1;
    tagToSubjectMap.set(ref.tag.toLowerCase(), `<Video ${vNum}>`);
    tagToSubjectMap.set(`video ${vNum}`.toLowerCase(), `<Video ${vNum}>`);
    tagToSubjectMap.set(`video${vNum}`.toLowerCase(), `<Video ${vNum}>`);
    subjectDefs.push(`<Video ${vNum}> supplies the reference camera movement, tracking rhythm, and pacing without contributing source characters.`);
  });

  audioRefs.forEach((ref, idx) => {
    const aNum = idx + 1;
    tagToSubjectMap.set(ref.tag.toLowerCase(), `<Audio ${aNum}>`);
    tagToSubjectMap.set(`audio ${aNum}`.toLowerCase(), `<Audio ${aNum}>`);
    tagToSubjectMap.set(`audio${aNum}`.toLowerCase(), `<Audio ${aNum}>`);
    subjectDefs.push(`<Audio ${aNum}> supplies the vocal timbre, pace, and delivery for the spoken lines.`);
  });

  const subjectDefLine = subjectDefs.length > 0 
    ? `subject_definitions: ${subjectDefs.join(' ')}`
    : `subject_definitions: <Subject 1> is the primary subject.`;

  // 2. summary
  const taskTags = [];
  if (imageRefs.length > 0) taskTags.push('reference generation');
  if (videoRefs.length > 0) taskTags.push('camera motion transfer');
  if (audioRefs.length > 0) taskTags.push('audio reference');
  const tagPrefix = taskTags.length > 0 ? `[${taskTags.join(' + ')}] ` : '';

  const summaryLine = `summary: ${tagPrefix}${cleanPrompt ? cleanPrompt.slice(0, 150) : 'Cinematic high-fidelity scene'}.`;

  // 3. retention_analysis
  const retentionParts = [];
  imageRefs.forEach((ref, idx) => {
    const sTag = tagToSubjectMap.get((ref.tag || '').toLowerCase()) || `<Subject ${idx + 1}>`;
    const picTag = `<Picture ${idx + 1}>`;
    if (ref.role === 'costume_style' || ref.role === 'costume') {
      retentionParts.push(`${sTag} (appears in composition): attribute_transfer - garment structure, fabric texture, and color palette are transferred; surrounding background is not copied.`);
    } else if (ref.role === 'environment' || ref.role === 'style') {
      retentionParts.push(`${sTag} (appears in composition): attribute_transfer - lighting tone, color grade, and atmosphere are transferred.`);
    } else if (ref.role === 'keyframe_start') {
      retentionParts.push(`${sTag} (anchors sequence start): keyframe_transition - the composition commences directly from ${picTag}.`);
    } else if (ref.role === 'keyframe_end') {
      retentionParts.push(`${sTag} (anchors sequence end): keyframe_transition - the composition converges toward ${picTag}.`);
    } else {
      retentionParts.push(`${sTag} (appears in composition): fully_preserved - facial features, identity, hair, and recognizable physical appearance are strictly retained.`);
    }
  });

  videoRefs.forEach((ref, idx) => {
    const vTag = `<Video ${idx + 1}>`;
    retentionParts.push(`${vTag} (guides [Shot 1]): attribute_transfer - camera speed, focal angle, and movement trajectory are transferred.`);
  });

  audioRefs.forEach((ref, idx) => {
    const aTag = `<Audio ${idx + 1}>`;
    retentionParts.push(`${aTag} (heard in [Shot 1]): reference - vocal resonance and rhythm guide dialogue delivery.`);
  });

  const retentionLine = retentionParts.length > 0
    ? `retention_analysis: ${retentionParts.join(' ')}`
    : `retention_analysis: <Subject 1> (appears in composition): fully_preserved - physical appearance and coherence are maintained.`;

  // 4. detailed_description
  // Replace @image1, @video1 mentions in user prompt with <Subject N>
  let translatedBody = cleanPrompt;
  tagToSubjectMap.forEach((replacement, tag) => {
    const regex = new RegExp(tag.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1'), 'gi');
    translatedBody = translatedBody.replace(regex, replacement);
  });

  // Ensure subjects appear in the prompt body if user didn't mention them explicitly
  if (imageRefs.length > 0 && !translatedBody.includes('<Subject')) {
    const subjectsList = imageRefs.map((_, i) => `<Subject ${i + 1}>`).join(' and ');
    translatedBody = `Featuring ${subjectsList}, ${translatedBody}`;
  }

  if (isImageMode) {
    const detailedLine = `detailed_description: The output is a high-resolution photorealistic still photograph. ${translatedBody || '<Subject 1> is featured prominently in the scene'}. Composition, skin textures, lighting, and fine materials are rendered with exquisite clarity and depth.`;
    return `${subjectDefLine} ${summaryLine} ${retentionLine} ${detailedLine}`.trim();
  }

  let cameraInstruction = '';
  if (preset === 'tracking' || cameraMotion === 'tracking') {
    cameraInstruction = 'The camera performs a smooth, low-angle tracking shot following the action with realistic physical parallax.';
  } else if (preset === 'push_in' || cameraMotion === 'push_in') {
    cameraInstruction = 'The camera performs a slow, cinematic push-in toward the subject, maintaining crisp focus and soft natural depth of field.';
  } else if (preset === 'orbit' || cameraMotion === 'orbit') {
    cameraInstruction = 'The camera executes a controlled semicircular orbit around the focal subject, revealing background perspective smoothly.';
  } else if (preset === 'drone' || cameraMotion === 'drone') {
    cameraInstruction = 'An expansive aerial drone sweep glides smoothly forward with cinematic horizon curvature and natural lighting.';
  } else if (videoRefs.length > 0) {
    cameraInstruction = `The camera adheres to the exact trajectory and tracking path referenced from <Video 1>.`;
  } else {
    cameraInstruction = 'The camera maintains fluid cinematic framing with subtle organic stabilization and realistic depth.';
  }

  const hasStartFrame = imageRefs.some(r => r.role === 'keyframe_start');
  const hasEndFrame = imageRefs.some(r => r.role === 'keyframe_end');
  let keyframeInstruction = '';
  if (hasStartFrame && hasEndFrame) {
    keyframeInstruction = 'The visual sequence seamlessly interpolates and morphs from the starting first frame into the target ending frame.';
  } else if (hasStartFrame) {
    keyframeInstruction = 'The video commences locked to the initial first frame anchor and fluidly evolves forward.';
  }

  const detailedLine = `detailed_description: The target video is a cinematic high-fidelity sequence. [Shot 1] ${translatedBody || '<Subject 1> is shown in the scene'}. ${keyframeInstruction ? keyframeInstruction + ' ' : ''}${cameraInstruction} Lighting, textures, and physics remain photorealistic and coherent throughout the shot.`;

  // 5. overall_soundscape
  const soundscapeLine = `overall_soundscape: Environmental room tone, subtle fabric movement, gentle footsteps, and crisp atmospheric ambient presence.`;

  // 6. non_diegetic_music
  const musicLine = `non_diegetic_music: N/A`;

  // Sliding window prefix if needed
  const windowPrefix = duration ? `[/duration=${duration}s]` : '';

  // Return formatted H3 Ref2VA string strictly on a SINGLE LINE or space-separated sections without empty lines
  return `${windowPrefix} ${subjectDefLine} ${summaryLine} ${retentionLine} ${detailedLine} ${soundscapeLine} ${musicLine}`.trim();
}

/**
 * MiniMax H3 Image Inpainting Compiler (Clean Plate / Replace Object)
 */
export function compileH3InpaintPrompt({
  mode = 'clean_plate',
  userPrompt = '',
  hasReference = false,
}) {
  const clean = (userPrompt || '').replace(/\r?\n+/g, ' ').trim();
  const refHeader = hasReference
    ? `subject_definitions: <Subject 1> is the replacement reference in <Picture 1>, matching their exact features, style, and identity. summary: [image inpaint] Replace the masked region with <Subject 1>. retention_analysis: <Subject 1> is transferred into the masked area while the rest of the image is fully preserved. `
    : '';

  const action = mode === 'clean_plate'
    ? `Inpaint and seamlessly reconstruct the masked area to blend naturally with the surrounding background textures, materials, and ambient lighting. Clean plate removal of the unwanted element without artifacts.`
    : hasReference
    ? `Replace the masked area with <Subject 1> from <Picture 1>. Seamlessly integrate the new element into the composition, matching perspective, lighting, depth, and shadow interactions. ${clean}`
    : `Replace the masked area with: ${clean || 'the described subject'}. Seamlessly integrate the new element into the composition, matching perspective, lighting, depth, and shadow interactions.`;

  return `${refHeader}integrated_multimodal_description: [Shot 1] Edit the image within the masked area. ${action}`.trim();
}
