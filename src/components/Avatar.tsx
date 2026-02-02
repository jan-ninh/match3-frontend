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

  return (
    <div className="rounded-full overflow-hidden bg-gray-300 flex items-center justify-center" style={{ width: size, height: size }}>
      <img
        src={finalSrc}
        alt="avatar"
        className="w-full h-full object-cover"
        onError={(e) => {
          // fallback if image fails to load
          (e.currentTarget as HTMLImageElement).src = '/icons/user.svg';
        }}
      />
    </div>
  );
};

export default Avatar;
