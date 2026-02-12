import { Toaster } from 'react-hot-toast';
import { CYBER_TOAST_OPTIONS } from './toasterConfig';

type Props = {
  position?: 'top-center' | 'top-right' | 'top-left' | 'bottom-center' | 'bottom-right' | 'bottom-left';
};

export default function CyberToaster({ position = 'top-center' }: Props) {
  return <Toaster position={position} reverseOrder={false} gutter={10} toastOptions={CYBER_TOAST_OPTIONS} />;
}
