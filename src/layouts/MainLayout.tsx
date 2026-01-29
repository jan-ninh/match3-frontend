import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <>
      <div className="w-screen min-h-screen flex justify-center items-start overflow-y-auto">
        <div className="w-[720px] min-h-[960px] bg-gray-400">
          <Outlet />
        </div>
      </div>
    </>
  );
};
export default MainLayout;
