import React from 'react';

// Fingerprint Logo (SVG Repo ID: 532315 - Dazzle Line Icons)
export const FingerprintLogoIcon = ({ className = "w-6 h-6", stroke = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 11v1a3 3 0 0 0 3 3v1a5 5 0 0 1-5-5v-.5M12 5a7 7 0 0 0-7 7v1a9 9 0 0 0 9 9h1a7 7 0 0 0 7-7v-1a11 11 0 0 0-3-7.5M9 9.5a3 3 0 0 1 5.121-2.121M15.5 15.5a3 3 0 0 0 .5-1.5v-2a4 4 0 0 0-4-4h-.5a5 5 0 0 0-5 5v1a7 7 0 0 0 7 7h.5a9 9 0 0 0 9-9" />
  </svg>
);

export const ImageIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="3" />
    <circle cx="8.5" cy="8.5" r="2" />
    <path d="m21 15-4.5-4.5a2 2 0 0 0-2.8 0L6 18" />
  </svg>
);

export const VideoCameraIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m16 13 5.2 3.5c.5.3.8 0 .8-.5V8c0-.5-.3-.8-.8-.5L16 11" />
    <rect width="13" height="14" x="3" y="5" rx="3" />
  </svg>
);

export const MicrophoneIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

export const MusicNoteIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export const SparkleIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
  </svg>
);

export const MagicWandIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m15 4-1 2 1 2 2-1 2 1-1-2 1-2-2 1-2-1Z" />
    <path d="m20 12-1 1 1 1 1-1-1-1Z" />
    <path d="m2 22 11.5-11.5" />
  </svg>
);

export const EditPencilIcon = ({ className = "w-3.5 h-3.5", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 7 17 3l-13 13v4h4L21 7Z" />
    <path d="m14 6 4 4" />
  </svg>
);

export const TrashIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const UndoIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

export const RefreshIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.7 1 6.3 2.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

export const CheckIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CloseIcon = ({ className = "w-3 h-3", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const LayersIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

export const FilmFrameIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="3" />
    <path d="M7 3v18" />
    <path d="M17 3v18" />
    <path d="M3 7.5h4" />
    <path d="M3 12h18" />
    <path d="M3 16.5h4" />
    <path d="M17 7.5h4" />
    <path d="M17 16.5h4" />
  </svg>
);

export const HistoryClockIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const BookInfoIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6 6h10" />
    <path d="M6 10h10" />
  </svg>
);

export const TrackingIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m3 16 4-4 4 4 6-6" />
    <path d="M13 6h4v4" />
    <circle cx="5" cy="18" r="2" />
  </svg>
);

export const ZoomInIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
    <line x1="11" x2="11" y1="8" y2="14" />
    <line x1="8" x2="14" y1="11" y2="11" />
  </svg>
);

export const OrbitIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 0 0-9-9 9.8 9.8 0 0 0-6.7 2.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.8 9.8 0 0 0 6.7-2.7L21 16" />
    <path d="M16 21h5v-5" />
  </svg>
);

export const DroneIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M7 7l10 10" />
    <path d="M17 7l-10 10" />
    <circle cx="5" cy="5" r="2" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
  </svg>
);

export const ClapperboardIcon = ({ className = "w-5 h-5", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.2 6 3 11l-.9-3 17.2-5Z" />
    <path d="m6.2 5.3 3.1 3.9" />
    <path d="m12.4 3.4 3.1 4" />
    <path d="M3 11h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
);

export const DownloadIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export const PlayIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const PauseIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="4" height="16" x="6" y="4" rx="1" />
    <rect width="4" height="16" x="14" y="4" rx="1" />
  </svg>
);

export const GridIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="7" height="7" x="3" y="3" rx="1.5" />
    <rect width="7" height="7" x="14" y="3" rx="1.5" />
    <rect width="7" height="7" x="14" y="14" rx="1.5" />
    <rect width="7" height="7" x="3" y="14" rx="1.5" />
  </svg>
);

export const ListIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);

export const MasonryIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="7" height="11" x="3" y="3" rx="1.5" />
    <rect width="7" height="6" x="14" y="3" rx="1.5" />
    <rect width="7" height="6" x="3" y="15" rx="1.5" />
    <rect width="7" height="11" x="14" y="10" rx="1.5" />
  </svg>
);

export const SearchIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
  </svg>
);

export const FilterIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const GearIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const PlusIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" x2="12" y1="5" y2="19" />
    <line x1="5" x2="19" y1="12" y2="12" />
  </svg>
);

export const ChevronDownIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRightIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ArrowLeftIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export const ArrowRightIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const EyeIcon = ({ className = "w-4 h-4", stroke = "currentColor" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
