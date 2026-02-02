export type AvatarProps = {
  src?: string; // optional: avatar URL from backend or user selection
  size?: number; // diameter in px
};

/**
 * Avatar component
 * - Shows a circular frame with an image
 * - Defaults to "/icons/user.svg" if no src provided
 * - onError fallback ensures default image if src fails to load
 */
const Avatar = ({ src, size = 40 }: AvatarProps) => {
  const finalSrc = src || '/icons/user.svg'; // default avatar
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/icons/user.svg';
  };
  return (
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
      <img src={finalSrc} alt="avatar" loading="lazy" draggable={false} className="w-full h-full object-cover" onError={handleError} />
    </div>
  );
};

/**
 * Avatar component
 * - Shows a circular frame with an image
 * - Defaults to "/icons/user.svg" if no src provided
 * - onError fallback ensures default image if src fails to load
 */
const Avatar = ({ src, size = 40 }: AvatarProps) => {
  const finalSrc = src || '/icons/user.svg'; // default avatar
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/icons/user.svg';
  };
  return (
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
      <img src={finalSrc} alt="avatar" loading="lazy" draggable={false} className="w-full h-full object-cover" onError={handleError} />
    </div>
  );
};

export default Avatar;
