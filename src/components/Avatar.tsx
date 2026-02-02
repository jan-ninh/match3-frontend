export type AvatarProps = {
  src?: string;
  size?: number;
};

export default function Avatar({ src, size = 40 }: AvatarProps) {
  const finalSrc = src || '/icons/user.svg';

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/icons/user.svg';
  };

  return (
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden bg-gray-300 flex items-center justify-center">
      <img src={finalSrc} alt="avatar" loading="lazy" draggable={false} className="w-full h-full object-cover" onError={handleError} />
    </div>
  );
}