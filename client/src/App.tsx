import { Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './layouts/AppLayout';
import { AdminRoute, GuestRoute, ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { HomePage } from './pages/home/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';
import { SessionExpiredPage } from './pages/auth/SessionExpiredPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UsersPage } from './pages/users/UsersPage';
import { WorkspaceSettingsPage } from './pages/settings/WorkspaceSettingsPage';
import { MembersPage } from './pages/settings/MembersPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { FilesPage } from './pages/files/FilesPage';
import { ActivityPage } from './pages/activity/ActivityPage';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminOrganizationsPage } from './pages/admin/AdminOrganizationsPage';
import { AdminRolesPage } from './pages/admin/AdminRolesPage';
import { AdminPermissionsPage } from './pages/admin/AdminPermissionsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { MadrassaProfilePage } from './pages/madrassa/MadrassaProfilePage';
import { BranchesPage } from './pages/madrassa/BranchesPage';
import { AcademicYearsPage } from './pages/madrassa/AcademicYearsPage';
import { DepartmentsPage } from './pages/madrassa/DepartmentsPage';
import { ProgramsPage } from './pages/madrassa/ProgramsPage';
import { ClassesPage } from './pages/madrassa/ClassesPage';
import { SubjectsPage } from './pages/madrassa/SubjectsPage';
import { TimetablePage } from './pages/madrassa/TimetablePage';
import { StudentsPage } from './pages/students/StudentsPage';
import { StudentAdmissionPage } from './pages/students/StudentAdmissionPage';
import { StudentProfilePage } from './pages/students/StudentProfilePage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { DailyAttendancePage } from './pages/attendance/DailyAttendancePage';
import { AttendanceReportsPage } from './pages/attendance/AttendanceReportsPage';
import { AttendanceLeavesPage } from './pages/attendance/AttendanceLeavesPage';
import { FeesPage } from './pages/fees/FeesPage';
import { FeeStructuresPage } from './pages/fees/FeeStructuresPage';
import { FeeAssignmentsPage } from './pages/fees/FeeAssignmentsPage';
import { FeePaymentsPage } from './pages/fees/FeePaymentsPage';
import { FeeReportsPage } from './pages/fees/FeeReportsPage';
import { ExamsPage } from './pages/exams/ExamsPage';
import { ExamCreatePage } from './pages/exams/ExamCreatePage';
import { ExamDetailPage } from './pages/exams/ExamDetailPage';
import { ExamMarksEntryPage } from './pages/exams/ExamMarksEntryPage';
import { ExamResultsPage } from './pages/exams/ExamResultsPage';
import { ExamResultCardPage } from './pages/exams/ExamResultCardPage';
import { CertificatesPage } from './pages/certificates/CertificatesPage';
import { CertificateTemplatesPage } from './pages/certificates/CertificateTemplatesPage';
import { CertificateGeneratePage } from './pages/certificates/CertificateGeneratePage';
import { CertificateDetailPage } from './pages/certificates/CertificateDetailPage';
import { CertificateVerifyPage } from './pages/certificates/CertificateVerifyPage';
import { FinancePage } from './pages/finance/FinancePage';
import { FinanceAccountsPage } from './pages/finance/FinanceAccountsPage';
import { FinanceTransactionsPage } from './pages/finance/FinanceTransactionsPage';
import { FinanceExpensesPage } from './pages/finance/FinanceExpensesPage';
import { FinanceDonationsPage } from './pages/finance/FinanceDonationsPage';
import { FinanceReportsPage } from './pages/finance/FinanceReportsPage';
import { HrHomePage } from './pages/hr/HrHomePage';
import { HrEmployeesPage } from './pages/hr/HrEmployeesPage';
import { HrEmployeeDetailPage } from './pages/hr/HrEmployeeDetailPage';
import { HrDepartmentsPage } from './pages/hr/HrDepartmentsPage';
import { HrDesignationsPage } from './pages/hr/HrDesignationsPage';
import { HrAttendancePage } from './pages/hr/HrAttendancePage';
import { HrLeavesPage } from './pages/hr/HrLeavesPage';
import { HrPayrollPage } from './pages/hr/HrPayrollPage';
import { HrReportsPage } from './pages/hr/HrReportsPage';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route index element={<HomePage />} />
        <Route
          path="/login"
          element={<GuestRoute><LoginPage /></GuestRoute>}
        />
        <Route
          path="/register"
          element={<GuestRoute><RegisterPage /></GuestRoute>}
        />
        <Route
          path="/forgot-password"
          element={<GuestRoute><ForgotPasswordPage /></GuestRoute>}
        />
        <Route
          path="/reset-password"
          element={<GuestRoute><ResetPasswordPage /></GuestRoute>}
        />
        <Route
          path="/verify-email"
          element={<VerifyEmailPage />}
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/session-expired" element={<SessionExpiredPage />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="organizations" element={<AdminOrganizationsPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="permissions" element={<AdminPermissionsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/settings/workspace" element={<ProtectedRoute><WorkspaceSettingsPage /></ProtectedRoute>} />
          <Route path="/settings/members" element={<ProtectedRoute><MembersPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
          <Route path="/madrassa/profile" element={<ProtectedRoute><MadrassaProfilePage /></ProtectedRoute>} />
          <Route path="/branches" element={<ProtectedRoute><BranchesPage /></ProtectedRoute>} />
          <Route path="/academic-years" element={<ProtectedRoute><AcademicYearsPage /></ProtectedRoute>} />
          <Route path="/departments" element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute><ProgramsPage /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute><ClassesPage /></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><TimetablePage /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
          <Route path="/students/admission" element={<ProtectedRoute><StudentAdmissionPage /></ProtectedRoute>} />
          <Route path="/students/:id" element={<ProtectedRoute><StudentProfilePage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/daily" element={<ProtectedRoute><DailyAttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/reports" element={<ProtectedRoute><AttendanceReportsPage /></ProtectedRoute>} />
          <Route path="/attendance/leaves" element={<ProtectedRoute><AttendanceLeavesPage /></ProtectedRoute>} />
          <Route path="/fees" element={<ProtectedRoute><FeesPage /></ProtectedRoute>} />
          <Route path="/fees/structures" element={<ProtectedRoute><FeeStructuresPage /></ProtectedRoute>} />
          <Route path="/fees/assignments" element={<ProtectedRoute><FeeAssignmentsPage /></ProtectedRoute>} />
          <Route path="/fees/payments" element={<ProtectedRoute><FeePaymentsPage /></ProtectedRoute>} />
          <Route path="/fees/reports" element={<ProtectedRoute><FeeReportsPage /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
          <Route path="/exams/create" element={<ProtectedRoute><ExamCreatePage /></ProtectedRoute>} />
          <Route path="/exams/:id" element={<ProtectedRoute><ExamDetailPage /></ProtectedRoute>} />
          <Route path="/exams/marks-entry" element={<ProtectedRoute><ExamMarksEntryPage /></ProtectedRoute>} />
          <Route path="/exams/results" element={<ProtectedRoute><ExamResultsPage /></ProtectedRoute>} />
          <Route path="/exams/result-card" element={<ProtectedRoute><ExamResultCardPage /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute><CertificatesPage /></ProtectedRoute>} />
          <Route path="/certificates/templates" element={<ProtectedRoute><CertificateTemplatesPage /></ProtectedRoute>} />
          <Route path="/certificates/generate" element={<ProtectedRoute><CertificateGeneratePage /></ProtectedRoute>} />
          <Route path="/certificates/:id" element={<ProtectedRoute><CertificateDetailPage /></ProtectedRoute>} />
          <Route path="/verify-certificate/:code" element={<CertificateVerifyPage />} />
          <Route path="/finance" element={<ProtectedRoute><FinancePage /></ProtectedRoute>} />
          <Route path="/finance/accounts" element={<ProtectedRoute><FinanceAccountsPage /></ProtectedRoute>} />
          <Route path="/finance/transactions" element={<ProtectedRoute><FinanceTransactionsPage /></ProtectedRoute>} />
          <Route path="/finance/expenses" element={<ProtectedRoute><FinanceExpensesPage /></ProtectedRoute>} />
          <Route path="/finance/donations" element={<ProtectedRoute><FinanceDonationsPage /></ProtectedRoute>} />
          <Route path="/finance/reports" element={<ProtectedRoute><FinanceReportsPage /></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute><HrHomePage /></ProtectedRoute>} />
          <Route path="/hr/employees" element={<ProtectedRoute><HrEmployeesPage /></ProtectedRoute>} />
          <Route path="/hr/employees/new" element={<ProtectedRoute><HrEmployeeDetailPage /></ProtectedRoute>} />
          <Route path="/hr/employees/:id" element={<ProtectedRoute><HrEmployeeDetailPage /></ProtectedRoute>} />
          <Route path="/hr/departments" element={<ProtectedRoute><HrDepartmentsPage /></ProtectedRoute>} />
          <Route path="/hr/designations" element={<ProtectedRoute><HrDesignationsPage /></ProtectedRoute>} />
          <Route path="/hr/attendance" element={<ProtectedRoute><HrAttendancePage /></ProtectedRoute>} />
          <Route path="/hr/leaves" element={<ProtectedRoute><HrLeavesPage /></ProtectedRoute>} />
          <Route path="/hr/payroll" element={<ProtectedRoute><HrPayrollPage /></ProtectedRoute>} />
          <Route path="/hr/payroll/:id" element={<ProtectedRoute><HrPayrollPage /></ProtectedRoute>} />
          <Route path="/hr/reports" element={<ProtectedRoute><HrReportsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
