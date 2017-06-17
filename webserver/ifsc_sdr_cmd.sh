#!/bin/bash

# fft
function fft()
{
    csdr convert_u8_f | csdr fft_cc 2048 600000 HAMMING | csdr logpower_cf -60 | csdr fft_exchange_sides_ff 2048
}

# wfm_demodulator <central_frequency> <frequency> <sample_rate> 
function wfm_demodulator()
{
    local central_frequency=$1
    local frequency=$2
    local sample_rate=$3
    local rate=`python -c "print float($central_frequency-$frequency)/$sample_rate"`

    csdr convert_u8_f | csdr shift_addition_cc $rate | csdr bandpass_fir_fft_cc -0.01 0.01 0.008 | csdr fir_decimate_cc 10 0.05 HAMMING | csdr fmdemod_quadri_cf | csdr fractional_decimator_ff 6 | csdr deemphasis_wfm_ff 48000 75e-6 | csdr convert_f_s16 
}

# nfm_demodulator <central_frequency> <frequency> <sample_rate> 
function nfm_demodulator()
{
    local central_frequency=$1
    local frequency=$2
    local sample_rate=$3
    local rate=`python -c "print float($central_frequency-$frequency)/$sample_rate"`

    #csdr convert_u8_f | csdr shift_addition_cc $rate | csdr fir_decimate_cc 50 0.005 HAMMING | csdr fmdemod_quadri_cf | csdr limit_ff | csdr deemphasis_nfm_ff 48000 | csdr fastagc_ff | csdr convert_f_s16

    csdr convert_u8_f| csdr bandpass_fir_fft_cc -0.006 0.006 0.002 |csdr fir_decimate_cc 50 0.005 HAMMING | csdr fmdemod_quadri_cf | csdr limit_ff | csdr deemphasis_nfm_ff 48000 | csdr fastagc_ff | csdr convert_f_s16
}

# am_demodulator <central_frequency> <frequency> <sample_rate> 
function am_demodulator()
{
    local central_frequency=$1
    local frequency=$2
    local sample_rate=$3
    local rate=`python -c "print float($central_frequency-$frequency)/$sample_rate"`

    csdr convert_u8_f | csdr shift_addition_cc $rate | csdr fir_decimate_cc 50 0.005 HAMMING | csdr amdemod_cf | csdr fastdcblock_ff | csdr agc_ff | csdr limit_ff | csdr convert_f_s16
}


case "$1" in
    fft)
        fft "${@:2}"
        ;;

    wfm_demodulator)
        wfm_demodulator "${@:2}"
        ;;

    nfm_demodulator)
        nfm_demodulator "${@:2}"
        ;;

    am_demodulator)
        am_demodulator "${@:2}"
        ;;

    *)
        echo "Usage:"
        echo -e "\t$0 fft <fft_size> <out_of_every_n_samples> <input_port> <output_port>"
        exit 1
esac
