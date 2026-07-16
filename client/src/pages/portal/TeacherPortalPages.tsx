import { PortalDataPage } from './PortalPages';

export const TeacherPortalHomePage = () => <PortalDataPage title="Teacher Portal" endpoint="/api/portal/teacher/dashboard" />;
export const TeacherPortalDashboardPage = () => <PortalDataPage title="Teacher Dashboard" endpoint="/api/portal/teacher/dashboard" />;
export const TeacherPortalClassesPage = () => <PortalDataPage title="Teacher Classes" endpoint="/api/portal/teacher/classes" />;
export const TeacherPortalAttendancePage = () => <PortalDataPage title="Teacher Attendance" endpoint="/api/portal/teacher/attendance" />;
export const TeacherPortalResultsPage = () => <PortalDataPage title="Teacher Results" endpoint="/api/portal/teacher/results" />;
export const TeacherPortalTimetablePage = () => <PortalDataPage title="Teacher Timetable" endpoint="/api/portal/teacher/timetable" />;
export const TeacherPortalPayrollPage = () => <PortalDataPage title="Teacher Payroll" endpoint="/api/portal/teacher/payroll" />;

