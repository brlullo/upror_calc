
import {useRef, useState} from "react";
import { Formik, Field, Form } from "formik";
import { TextField, Button, Grid, FormControlLabel, Checkbox, Box, Container, Stack, Typography, InputAdornment, MenuItem, FormControl, InputLabel, Select } from "@mui/material";
import * as yup from "yup";
import * as ort from "onnxruntime-web";

const inputInfo = {
    'age_at_insertion': {
        'type': 'continuous',
        'label': 'Age at insertion',
        'name': 'age_at_insertion',
        'units': 'years',
    },
    'height_pre': {
        'type': 'continuous',
        'label': 'Height at insertion',
        'name': 'height_pre',
        'units': 'cm',
    },
    'weight_pre': {
        'type': 'continuous',
        'label': 'Weight at insertion',
        'name': 'weight_pre',
        'units': 'kg',
    },
    'eos_type': {
        'type': 'categorical',
        'label': 'EOS etiology',
        'name': 'eos_type',
        'options': ['Congenital', 'Idiopathic', 'Neuromuscular', 'Syndromic'],
    },
    'amb_status_preop': {
        'type': 'categorical',
        'label': 'Ambulatory status',
        'name': 'amb_status_preop',
        'options': ['Ambulatory', 'Non-ambulatory'],
    },

    'major_cobb_angle_pre': {
        'type': 'continuous',
        'label': 'Major Cobb angle',
        'name': 'major_cobb_angle_pre',
        'units': 'degrees',
    },
    'minor_cobb_angle_pre': {
        'type': 'continuous',
        'label': 'Minor Cobb angle',
        'name': 'minor_cobb_angle_pre',
        'units': 'degrees',
    },
    'kyphosis_pre': {
        'type': 'continuous',
        'label': 'Kyphosis',
        'name': 'kyphosis_pre',
        'units': 'degrees',
    },

    'construct_type_initial': {
        'type': 'categorical',
        'label': 'Initial construct type',
        'name': 'construct_type_initial',
        'options': ['MCGR', 'TGR', 'VEPTR'],
    },
    'construct_side_initial': {
        'type': 'categorical',
        'label': 'Initial construct laterality',
        'name': 'construct_side_initial',
        'options': ['Bilateral', 'Unilateral'],
    },
    'superior_attach_initial': {
        'type': 'categorical',
        'label': 'Superior anchor site',
        'name': 'superior_attach_initial',
        'options': ['Spine', 'Rib'],
    },
    'num_superior_anchors_initial': {
        'type': 'continuous',
        'label': 'Number of superior anchors',
        'name': 'num_superior_anchors_initial',
        'units': 'anchors',
    },
    'inferior_attach_initial': {
        'type': 'categorical',
        'label': 'Inferior anchor site',
        'name': 'inferior_attach_initial',
        'options': ['Spine', 'Pelvis'],
    },
};

const inputCategories = {
    'Patient factors': ['age_at_insertion', 'height_pre', 'weight_pre', 'eos_type', 'amb_status_preop'],
    'Radiographic factors': ['major_cobb_angle_pre', 'minor_cobb_angle_pre', 'kyphosis_pre'],
    'Planned construct': ['construct_type_initial', 'construct_side_initial', 'superior_attach_initial', 'num_superior_anchors_initial', 'inferior_attach_initial'],
};

const validationSchema = yup.object({
    construct_type_initial: yup.string().required("Required"),
    eos_type: yup.string().required("Required"),
    amb_status_preop: yup.string().required("Required"),
    age_at_insertion: yup.number().required("Required"),
    weight_pre: yup.number().required("Required"),
    height_pre: yup.number().required("Required"),
    major_cobb_angle_pre: yup.number().required("Required"),
    minor_cobb_angle_pre: yup.number().required("Required"),
    kyphosis_pre: yup.number().required("Required"),
    construct_side_initial: yup.string().required("Required"),
    superior_attach_initial: yup.string().required("Required"),
    num_superior_anchors_initial: yup.number().required("Required"),
    inferior_attach_initial: yup.string().required("Required"),
});

export function App() {
    const [result, setResult] = useState('');

    const initialValues = {
        construct_type_initial: '',
        eos_type: '',
        amb_status_preop: '',
        age_at_insertion: '',
        weight_pre: '',
        height_pre: '',
        major_cobb_angle_pre: '',
        minor_cobb_angle_pre: '',
        kyphosis_pre: '',
        construct_side_initial: '',
        superior_attach_initial: '',
        num_superior_anchors_initial: '',
        inferior_attach_initial: ''
    };

    const oneHotEncode = (selectedValue, options) => {
        const encoding = new Array(options.length).fill(0);
        encoding[options.indexOf(selectedValue)] = 1;
        return encoding;
    };

    const onSubmit = (values) => {

        const inputs = {

            construct_type_initial_MCGR: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_type_initial, inputInfo['construct_type_initial']['options'])[0]]), [1, 1]),
            construct_type_initial_TGR: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_type_initial, inputInfo['construct_type_initial']['options'])[1]]), [1, 1]),
            construct_type_initial_VEPTR: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_type_initial, inputInfo['construct_type_initial']['options'])[2]]), [1, 1]),

            eos_type_Congenital: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, inputInfo['eos_type']['options'])[0]]), [1, 1]),
            eos_type_Idiopathic: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, inputInfo['eos_type']['options'])[1]]), [1, 1]),
            eos_type_Neuromuscular: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, inputInfo['eos_type']['options'])[2]]), [1, 1]),
            eos_type_Syndromic: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, inputInfo['eos_type']['options'])[3]]), [1, 1]),

            amb_status_preop_Ambulatory: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.amb_status_preop, inputInfo['amb_status_preop']['options'])[0]]), [1, 1]),
            amb_status_preop_Non_ambulatory: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.amb_status_preop, inputInfo['amb_status_preop']['options'])[1]]), [1, 1]),

            age_at_insertion: new ort.Tensor("float32", new Float32Array([values.age_at_insertion]), [1, 1]),
            weight_pre: new ort.Tensor("float32", new Float32Array([values.weight_pre]), [1, 1]),
            height_pre: new ort.Tensor("float32", new Float32Array([values.height_pre]), [1, 1]),
            major_cobb_angle_pre: new ort.Tensor("float32", new Float32Array([values.major_cobb_angle_pre]), [1, 1]),
            minor_cobb_angle_pre: new ort.Tensor("float32", new Float32Array([values.minor_cobb_angle_pre]), [1, 1]),
            kyphosis_pre: new ort.Tensor("float32", new Float32Array([values.kyphosis_pre]), [1, 1]),

            construct_side_initial_Bilateral: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_side_initial, inputInfo['construct_side_initial']['options'])[0]]), [1, 1]),
            construct_side_initial_Unilateral: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_side_initial, inputInfo['construct_side_initial']['options'])[1]]), [1, 1]),

            superior_attach_initial_Spine: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.superior_attach_initial, inputInfo['superior_attach_initial']['options'])[0]]), [1, 1]),
            superior_attach_initial_Rib: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.superior_attach_initial, inputInfo['superior_attach_initial']['options'])[1]]), [1, 1]),

            num_superior_anchors_initial: new ort.Tensor("float32", new Float32Array([values.num_superior_anchors_initial]), [1, 1]),

            inferior_attach_initial_Spine: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.inferior_attach_initial, inputInfo['inferior_attach_initial']['options'])[0]]), [1, 1]),
            inferior_attach_initial_Pelvis: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.inferior_attach_initial, inputInfo['inferior_attach_initial']['options'])[1]]), [1, 1])
        };

        console.log(inputs);

        runModel(inputs)
    };

    const runModel = async (inputs) => {

        // WASM
        ort.env.wasm.wasmPaths = {
            'ort-wasm.wasm': '/ort-wasm.wasm',
        }

        try {
            // STEP 3: Load ONNX model
            const session = await ort.InferenceSession.create('/upror_growing.onnx');

            // STEP 5: Run model
            const output = await session.run(inputs);

            const probTensor = output["probabilities"];
            const probability = probTensor.data[1] as number; // assuming index 1 is 'UPROR'

            setResult('Predicted UPROR Risk: ' + (probability * 100).toFixed(0) + '%');

        } catch (err) {
            console.error("Error running ONNX model:", err);
        }
    };

    return (
        <Container maxWidth={"md"}>

            <Stack spacing={2}>
                <Typography variant="h2">EOS UPROR Calculator</Typography>
                <Typography variant="subtitle1">This calculator uses a logistic regression machine learning model to
                    calculate an early-onset scoliosis (EOS) patient's risk of experiencing an unplanned return to the operating room (UPROR) over their treatment course.</Typography>

                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={onSubmit}
                >
                    {({values, handleChange, handleBlur, errors, touched}) => (

                        <Form>

                            <Stack spacing={1}>

                                {Object.keys(inputCategories).map((category) => (
                                    <Stack key={category + '_stack'} spacing={1}>
                                        <Typography key={category + '_section'} variant={"subtitle2"}>{category}:</Typography>
                                        {Object.values(inputCategories[category]).map((fieldID:string) => {

                                            if (inputInfo[fieldID]['type'] === 'continuous') {
                                                return (
                                                    <TextField
                                                        label={inputInfo[fieldID]['label']}
                                                        name={inputInfo[fieldID]['name']}
                                                        key={inputInfo[fieldID]['name']}
                                                        value={values[inputInfo[fieldID]['name']]}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={touched[inputInfo[fieldID]['name']] && Boolean(errors[inputInfo[fieldID]['name']])}
                                                        helperText={touched[inputInfo[fieldID]['name']] && errors[inputInfo[fieldID]['name']]}
                                                        fullWidth
                                                        size="small"
                                                        slotProps={{
                                                            input: {
                                                                endAdornment: <InputAdornment position={"end"}>{inputInfo[fieldID]['units']}</InputAdornment>,
                                                            },
                                                        }}
                                                    />
                                                );
                                            }

                                            if (inputInfo[fieldID]['type'] === 'categorical') {
                                                return (
                                                    <TextField
                                                        label={inputInfo[fieldID]['label']}
                                                        name={inputInfo[fieldID]['name']}
                                                        key={inputInfo[fieldID]['name']}
                                                        value={values[inputInfo[fieldID]['name']]}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={touched[inputInfo[fieldID]['name']] && Boolean(errors[inputInfo[fieldID]['name']])}
                                                        helperText={touched[inputInfo[fieldID]['name']] && errors[inputInfo[fieldID]['name']]}
                                                        select
                                                        fullWidth
                                                        size="small"
                                                    >
                                                        {Object.values(inputInfo[fieldID]['options']).map((optionName) => (
                                                            <MenuItem key={optionName} value={optionName}>{optionName}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                );
                                            }
                                        })}
                                    </Stack>
                                ))}

                                <Button variant={"contained"} type={"submit"}>Calculate</Button>

                                <Typography variant="h6" color="primary">{result}</Typography>

                            </Stack>

                        </Form>
                    )}
                </Formik>

            </Stack>

        </Container>
    )
}
