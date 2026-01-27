import React from 'react';
import MPLayout from './MPLayout';
import './MPSkeletons.css';

// Reusable parts
const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton skeleton-label"></div>
        <div className="skeleton skeleton-value"></div>
        <div className="skeleton skeleton-subtext"></div>
    </div>
);

const SkeletonTableRow = () => (
    <div className="skeleton-table-row">
        <div className="skeleton" style={{ width: '40px', height: '20px' }}></div>
        <div className="skeleton" style={{ width: '20%', height: '20px' }}></div>
        <div className="skeleton" style={{ width: '15%', height: '20px' }}></div>
        <div className="skeleton" style={{ width: '15%', height: '20px' }}></div>
        <div className="skeleton" style={{ width: '10%', height: '20px' }}></div>
        <div className="skeleton" style={{ flex: 1, height: '30px' }}></div>
    </div>
);

// Dashboard Skeleton
export const DashboardSkeleton = () => (
    <MPLayout title="Dashboard">
        <div className="mp-dashboard-content">
            {/* Stat Cards */}
            <div className="skeleton-dashboard-grid">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>

            <div className="skeleton-dashboard-grid">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>

            {/* Charts */}
            <div className="skeleton-charts-grid">
                <div className="skeleton skeleton-chart"></div>
                <div className="skeleton skeleton-chart"></div>
            </div>

            {/* Table */}
            <div className="skeleton-table-container">
                <div className="skeleton skeleton-table-header"></div>
                {[1, 2, 3, 4, 5].map(i => <SkeletonTableRow key={i} />)}
            </div>
        </div>
    </MPLayout>
);

// AL Page Skeleton
export const ALPageSkeleton = () => (
    <MPLayout title="Agent Leaders">
        <div className="mp-dashboard-content">
            <div className="skeleton skeleton-header-title"></div>

            <div className="skeleton skeleton-filter-bar"></div>

            <div className="skeleton-dashboard-grid">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>

            <div className="skeleton-table-container">
                <div className="skeleton skeleton-table-header"></div>
                {[1, 2, 3, 4, 5, 6, 7].map(i => <SkeletonTableRow key={i} />)}
            </div>
        </div>
    </MPLayout>
);

// AP Page Skeleton
export const APPageSkeleton = () => (
    <MPLayout title="Agent Partners">
        <div className="mp-dashboard-content">
            <div className="skeleton skeleton-header-title"></div>

            <div className="skeleton skeleton-filter-bar"></div>

            <div className="skeleton-dashboard-grid">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>

            <div className="skeleton-table-container">
                <div className="skeleton skeleton-table-header"></div>
                {[1, 2, 3, 4, 5, 6, 7].map(i => <SkeletonTableRow key={i} />)}
            </div>
        </div>
    </MPLayout>
);
