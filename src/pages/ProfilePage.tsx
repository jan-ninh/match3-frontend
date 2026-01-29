import { Avatar, Badge, Navbar } from '@/components';

const ProfilePage = () => {
  return (
    <>
      <div>
        <Navbar />
        <Avatar />
        <p>Name</p>
      </div>
      <div>info of user game</div>
      <div>progressbar</div>
      <div>
        <Badge />
      </div>
    </>
  );
};
export default ProfilePage;
