import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <>
      <div className="w-screen h-screen bg-gray-700 flex justify-center items-center">
        <div className="w-[720px] h-[960px] bg-gray-400">
          <Outlet />
        </div>
      </div>
    </>
  );
};
export default MainLayout;
