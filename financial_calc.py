import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from st_aggrid import AgGrid, GridOptionsBuilder

# Initialize session state
if 'inputs' not in st.session_state:
    st.session_state.inputs = {
        'epf_saving': 0.0,
        'retire_age': 0,
        'non_epf_saving': 0.0,
        'current_salary': 0.0,
        'current_age': 0,
        'monthly_saving_non_epf': 0.0,
        'salary_increment': 0.0,
        'mortgage_expense': 0.0,
        'mortgage_years_left': 0,
        'car_loan_expense': 0.0,
        'car_loan_years_left': 0,
        'other_fixed_payments': 0.0,
        'variable_expenses': 0.0,
        'groceries_cost': 0.0,
        'other_variable_costs': 0.0,
        'contingencies_expenses': 0.0
    }

if 'years_to_retirement' not in st.session_state:
    st.session_state.years_to_retirement = 0

if 'total_savings' not in st.session_state:
    st.session_state.total_savings = 0.0

# Function to reset session state inputs
def reset_inputs():
    for key in st.session_state.inputs:
        if isinstance(st.session_state.inputs[key], float):
            st.session_state.inputs[key] = 0.0
        else:
            st.session_state.inputs[key] = 0
    st.session_state.years_to_retirement = 0
    st.session_state.total_savings = 0.0

# Set up Streamlit app with a sidebar for navigation
st.sidebar.title("Navigation")
tab = st.sidebar.selectbox("Select a tab", ["Saving Tab", "Expenses Tab", "Consolidated Financial"])
reset_button = st.sidebar.button("Reset Data", on_click=reset_inputs)

if tab == "Saving Tab":
    # Saving Tab
    st.title('Retirement Savings Calculator - Saving')
    st.header('Saving Input')
    
    # Arrange inputs in two columns
    col1, col2 = st.columns(2)
    
    with col1:
        st.session_state.inputs['epf_saving'] = st.number_input('Total saving in EPF (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['epf_saving'])
        st.session_state.inputs['retire_age'] = st.number_input('Planned age to retire', min_value=0, max_value=100, format="%d", value=st.session_state.inputs['retire_age'])
        st.session_state.inputs['non_epf_saving'] = st.number_input('Total saving non EPF (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['non_epf_saving'])
        st.session_state.inputs['current_salary'] = st.number_input('Current monthly salary (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['current_salary'])

    with col2:
        st.session_state.inputs['current_age'] = st.number_input('Current age', min_value=0, max_value=100, format="%d", value=st.session_state.inputs['current_age'])
        st.session_state.inputs['monthly_saving_non_epf'] = st.number_input('Monthly Saving Non EPF (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['monthly_saving_non_epf'])
        st.session_state.inputs['salary_increment'] = st.number_input('Yearly increment of salary (%)', min_value=0.0, format="%.2f", value=st.session_state.inputs['salary_increment'])

    # Calculation
    st.header('Retirement Savings Calculation')
    st.session_state.years_to_retirement = st.session_state.inputs['retire_age'] - st.session_state.inputs['current_age']

    # Initialize EPF savings and prepare for data collection
    future_epf_saving = st.session_state.inputs['epf_saving']
    future_non_epf_saving = st.session_state.inputs['non_epf_saving']
    epf_savings_over_time = []
    personal_savings_over_time = []

    # Calculate yearly contributions and compound interest
    current_salary = st.session_state.inputs['current_salary']
    for year in range(st.session_state.years_to_retirement):
        # Determine EPF contribution rate based on salary
        if current_salary < 5000:
            total_contribution_rate = 0.24  # 24% contribution rate
        else:
            total_contribution_rate = 0.23  # 23% contribution rate
        
        # Monthly EPF contribution
        monthly_contribution = current_salary * total_contribution_rate
        
        # Monthly savings details for EPF
        monthly_savings_epf = []
        for month in range(12):
            future_epf_saving += monthly_contribution  # Add monthly contribution
            monthly_savings_epf.append(future_epf_saving)
        
        # Apply yearly EPF dividend (5% average)
        dividend_epf = future_epf_saving * 0.05
        future_epf_saving += dividend_epf

        # Store the EPF savings for this year
        epf_savings_over_time.append({
            'Year': st.session_state.inputs['current_age'] + year + 1,
            'January': round(monthly_savings_epf[0], 2),
            'February': round(monthly_savings_epf[1], 2),
            'March': round(monthly_savings_epf[2], 2),
            'April': round(monthly_savings_epf[3], 2),
            'May': round(monthly_savings_epf[4], 2),
            'June': round(monthly_savings_epf[5], 2),
            'July': round(monthly_savings_epf[6], 2),
            'August': round(monthly_savings_epf[7], 2),
            'September': round(monthly_savings_epf[8], 2),
            'October': round(monthly_savings_epf[9], 2),
            'November': round(monthly_savings_epf[10], 2),
            'December': round(monthly_savings_epf[11], 2),
            'Dividend': round(dividend_epf, 2),
            'EPF Savings End of Year': round(future_epf_saving, 2)
        })

        # Personal savings calculation with monthly contributions and yearly dividend (3%)
        monthly_savings_non_epf_list = []
        for month in range(12):
            future_non_epf_saving += st.session_state.inputs['monthly_saving_non_epf']
            monthly_savings_non_epf_list.append(future_non_epf_saving)
        
        # Apply yearly dividend (3% average) for personal savings
        dividend_non_epf = future_non_epf_saving * 0.03
        future_non_epf_saving += dividend_non_epf

        # Store the personal savings for this year
        personal_savings_over_time.append({
            'Year': st.session_state.inputs['current_age'] + year + 1,
            'January': round(monthly_savings_non_epf_list[0], 2),
            'February': round(monthly_savings_non_epf_list[1], 2),
            'March': round(monthly_savings_non_epf_list[2], 2),
            'April': round(monthly_savings_non_epf_list[3], 2),
            'May': round(monthly_savings_non_epf_list[4], 2),
            'June': round(monthly_savings_non_epf_list[5], 2),
            'July': round(monthly_savings_non_epf_list[6], 2),
            'August': round(monthly_savings_non_epf_list[7], 2),
            'September': round(monthly_savings_non_epf_list[8], 2),
            'October': round(monthly_savings_non_epf_list[9], 2),
            'November': round(monthly_savings_non_epf_list[10], 2),
            'December': round(monthly_savings_non_epf_list[11], 2),
            'Dividend': round(dividend_non_epf, 2),
            'Personal Savings End of Year': round(future_non_epf_saving, 2)
        })

        # Increase salary for next year
        current_salary *= (1 + st.session_state.inputs['salary_increment'] / 100)

    # Convert to DataFrame for plotting and display
    df_epf_savings = pd.DataFrame(epf_savings_over_time)
    df_personal_savings = pd.DataFrame(personal_savings_over_time)

    # Format numbers with commas
    df_epf_savings = df_epf_savings.applymap(lambda x: f"{x:,.2f}" if isinstance(x, (int, float)) else x)
    df_personal_savings = df_personal_savings.applymap(lambda x: f"{x:,.2f}" if isinstance(x, (int, float)) else x)

    # Plot the EPF and personal savings over time using Plotly
    if not df_epf_savings.empty and not df_personal_savings.empty:
        fig_savings = go.Figure()
        fig_savings.add_trace(go.Scatter(
            x=df_epf_savings['Year'],
            y=df_epf_savings['EPF Savings End of Year'],
            mode='lines+markers',
            name='EPF Savings',
            marker=dict(symbol='x', color='orange')
        ))
        fig_savings.add_trace(go.Scatter(
            x=df_personal_savings['Year'],
            y=df_personal_savings['Personal Savings End of Year'],
            mode='lines+markers',
            name='Personal Savings',
            marker=dict(symbol='diamond', color='blue')
        ))
        fig_savings.update_layout(
            title='Projected Savings Over Time',
            xaxis_title='Year',
            yaxis_title='Savings (RM)',
            legend=dict(
                orientation='h',
                yanchor='bottom',
                y=-0.2,
                xanchor='center',
                x=0.5
            )
        )
        st.plotly_chart(fig_savings)

    # Display the interactive table of EPF savings over time using AgGrid
    st.subheader('Projected EPF Savings Table')
    gb = GridOptionsBuilder.from_dataframe(df_epf_savings)
    gb.configure_pagination(paginationAutoPageSize=True)  # Add pagination
    gb.configure_side_bar()  # Add a sidebar
    gb.configure_default_column(editable=False, groupable=True)
    grid_options = gb.build()

    AgGrid(df_epf_savings, gridOptions=grid_options, key='epf_table')

    # Display the interactive table of Personal savings over time using AgGrid
    st.subheader('Projected Personal Savings Table')
    gb_personal = GridOptionsBuilder.from_dataframe(df_personal_savings)
    gb_personal.configure_pagination(paginationAutoPageSize=True)  # Add pagination
    gb_personal.configure_side_bar()  # Add a sidebar
    gb_personal.configure_default_column(editable=False, groupable=True)
    grid_options_personal = gb_personal.build()

    AgGrid(df_personal_savings, gridOptions=grid_options_personal, key='personal_table')

    # Output the final projected EPF, Personal savings, and Total savings
    st.subheader('Projected EPF Savings at Retirement')
    st.write(f'RM {future_epf_saving:,.2f}')

    st.subheader('Projected Personal Savings at Retirement')
    st.write(f'RM {future_non_epf_saving:,.2f}')

    # Calculate total savings
    st.session_state.total_savings = future_epf_saving + future_non_epf_saving
    st.subheader('Total Savings at Retirement')
    st.write(f'RM {st.session_state.total_savings:,.2f}')

elif tab == "Expenses Tab":
    # Expenses Tab
    st.title('Retirement Savings Calculator - Expenses')
    st.header('Expenses Input')
    
    # Years to retirement calculation
    st.write(f'Years to retire: {st.session_state.years_to_retirement}')

    # Arrange inputs in columns
    exp_col1, exp_col2 = st.columns(2)

    with exp_col1:
        st.session_state.inputs['mortgage_expense'] = st.number_input('Monthly Fixed Expenses (Mortgage) (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['mortgage_expense'])
        st.session_state.inputs['mortgage_years_left'] = st.number_input('Years Left to Serve Mortgage - After Retired', min_value=0, format="%d", value=st.session_state.inputs['mortgage_years_left'])
        st.session_state.inputs['car_loan_expense'] = st.number_input('Monthly Fixed Expenses (Car Loan) (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['car_loan_expense'])
        st.session_state.inputs['car_loan_years_left'] = st.number_input('Years Left to Serve Car Loan - After Retired', min_value=0, format="%d", value=st.session_state.inputs['car_loan_years_left'])
        st.session_state.inputs['other_fixed_payments'] = st.number_input('Other Fixed Payments (Takaful/Insurance) (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['other_fixed_payments'])

    with exp_col2:
        st.session_state.inputs['variable_expenses'] = st.number_input('Variable Monthly Expenses (Bills) (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['variable_expenses'])
        st.session_state.inputs['groceries_cost'] = st.number_input('Groceries Cost (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['groceries_cost'])
        st.session_state.inputs['other_variable_costs'] = st.number_input('Other Variable Costs (Petrol, Gas) (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['other_variable_costs'])
        st.session_state.inputs['contingencies_expenses'] = st.number_input('Contingencies Expenses (RM)', min_value=0.0, format="%.2f", value=st.session_state.inputs['contingencies_expenses'])

    # Calculate total yearly expenses
    total_monthly_expenses = (st.session_state.inputs['mortgage_expense'] +
                              st.session_state.inputs['car_loan_expense'] +
                              st.session_state.inputs['other_fixed_payments'] +
                              st.session_state.inputs['variable_expenses'] +
                              st.session_state.inputs['groceries_cost'] +
                              st.session_state.inputs['other_variable_costs'] +
                              st.session_state.inputs['contingencies_expenses'])
    
    yearly_expenses = total_monthly_expenses * 12

    # Calculate estimated savings needed
    estimated_savings_needed = yearly_expenses / 0.04

    st.subheader('Estimated Savings Needed for Retirement')
    st.write(f'RM {estimated_savings_needed:,.2f}')

    # Plot the bar chart
    fig = go.Figure()
    fig.add_trace(go.Bar(
        name='Total Savings for Retirement',
        x=['Retirement Savings'],
        y=[st.session_state.total_savings],
        marker_color='orange',
        text=f'RM {st.session_state.total_savings:,.2f}',
        textposition='outside'
    ))
    fig.add_trace(go.Bar(
        name='Estimated Savings Needed',
        x=['Estimated Savings Needed'],
        y=[estimated_savings_needed],
        marker_color='blue',
        text=f'RM {estimated_savings_needed:,.2f}',
        textposition='outside'
    ))

    fig.update_layout(
        title='Comparison of Total Savings vs Estimated Savings Needed',
        xaxis_title='Category',
        yaxis_title='Amount (RM)',
        barmode='group',
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=-0.2,
            xanchor='center',
            x=0.5
        )
    )
    
    st.plotly_chart(fig)

elif tab == "Consolidated Financial":
    # Consolidated Financial Tab
    st.title('Retirement Savings Calculator - Consolidated Financial')

    # Calculate expenses from retirement to age 80
    inflation_rate = 0.03
    conservative_dividend = 0.04
    retirement_age = st.session_state.inputs['retire_age']
    max_age = 80

    # Prepare to accumulate expenses and calculate savings after retirement
    age_range = list(range(retirement_age, max_age + 1))
    savings_over_time = []
    expenses_over_time = []
    cumulative_expenses_over_time = []

    # Initial yearly expenses calculation based on user input
    initial_yearly_expenses = (
        (st.session_state.inputs['mortgage_expense'] * 12) +
        (st.session_state.inputs['car_loan_expense'] * 12) +
        (st.session_state.inputs['other_fixed_payments'] * 12) +
        (st.session_state.inputs['variable_expenses'] * 12) +
        (st.session_state.inputs['groceries_cost'] * 12) +
        (st.session_state.inputs['other_variable_costs'] * 12) +
        (st.session_state.inputs['contingencies_expenses'] * 12)
    )
    
    remaining_savings = st.session_state.total_savings
    cumulative_expenses = 0  # Initialize cumulative expenses

    # Data collection for consolidated table
    consolidated_data = []

    for i, age in enumerate(age_range):
        # Calculate mortgage and car loan without inflation
        if i < st.session_state.inputs['mortgage_years_left']:
            mortgage_expense = st.session_state.inputs['mortgage_expense'] * 12
        else:
            mortgage_expense = 0
        
        if i < st.session_state.inputs['car_loan_years_left']:
            car_loan_expense = st.session_state.inputs['car_loan_expense'] * 12
        else:
            car_loan_expense = 0

        # Calculate other expenses with inflation
        if i == 0:
            yearly_expense = initial_yearly_expenses
        else:
            other_expenses = (
                (st.session_state.inputs['other_fixed_payments'] * 12) +
                (st.session_state.inputs['variable_expenses'] * 12) +
                (st.session_state.inputs['groceries_cost'] * 12) +
                (st.session_state.inputs['other_variable_costs'] * 12) +
                (st.session_state.inputs['contingencies_expenses'] * 12)
            ) * (1 + inflation_rate) ** (i)
            yearly_expense = mortgage_expense + car_loan_expense + other_expenses
        
        # Calculate cumulative expenses
        cumulative_expenses += yearly_expense

        # Save the yearly expenses and savings for each year
        expenses_over_time.append(yearly_expense)
        cumulative_expenses_over_time.append(cumulative_expenses)
        
        # Apply dividend to savings and subtract yearly expenses
        remaining_savings += remaining_savings * conservative_dividend
        remaining_savings -= yearly_expense
        savings_over_time.append(remaining_savings)

        # Collect data for the table
        consolidated_data.append({
            'Age': age,
            'Yearly Expenses (RM)': yearly_expense,
            'Cumulative Expenses (RM)': cumulative_expenses,
            'Savings After Expenses (RM)': remaining_savings
        })

    # Plot savings after expenses, yearly expenses, and cumulative expenses over time
    fig_consolidated = go.Figure()

    fig_consolidated.add_trace(go.Scatter(
        x=age_range,
        y=savings_over_time,
        mode='lines+markers',
        name='Savings After Expenses',
        line=dict(color='blue', dash='dash'),
        marker=dict(symbol='diamond')
    ))

    fig_consolidated.add_trace(go.Scatter(
        x=age_range,
        y=expenses_over_time,
        mode='lines+markers',
        name='Yearly Expenses',
        line=dict(color='red')
    ))

    fig_consolidated.add_trace(go.Scatter(
        x=age_range,
        y=cumulative_expenses_over_time,
        mode='lines+markers',
        name='Cumulative Expenses',
        line=dict(color='green')
    ))

    fig_consolidated.update_layout(
        title='Savings After Expenses, Yearly Expenses, and Cumulative Expenses from Retirement to Age 80',
        xaxis_title='Age',
        yaxis_title='Amount (RM)',
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=-0.2,
            xanchor='center',
            x=0.5
        )
    )

    st.plotly_chart(fig_consolidated)

    # Display the table below the chart
    df_consolidated = pd.DataFrame(consolidated_data)
    df_consolidated = df_consolidated.applymap(lambda x: f"{x:,.2f}" if isinstance(x, (int, float)) else x)

    st.subheader('Consolidated Financial Table')
    gb_consolidated = GridOptionsBuilder.from_dataframe(df_consolidated)
    gb_consolidated.configure_pagination(paginationAutoPageSize=True)  # Add pagination
    gb_consolidated.configure_side_bar()  # Add a sidebar
    gb_consolidated.configure_default_column(editable=False, groupable=True)
    grid_options_consolidated = gb_consolidated.build()

    AgGrid(df_consolidated, gridOptions=grid_options_consolidated, key='consolidated_table')
